"""Routes for Supabase authentication management."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.db.session import get_authenticated_db_session, get_db_session
from app.schemas.auth import (
    LoginRequest,
    LoginResponse,
    OAuthCallbackRequest,
    OAuthCallbackResponse,
    OAuthUrlResponse,
    PasswordResetRequest,
    PasswordResetResponse,
    RefreshTokenRequest,
    SessionToken,
    SignUpRequest,
    SignUpResponse,
    UpdatePasswordRequest,
    UpdatePasswordResponse,
    UserProfileResponse,
    VerifyTokenAndUpdatePasswordRequest,
)
from app.services.auth import (
    get_current_user_id,
    get_google_oauth_url,
    get_user_profile,
    login_user,
    process_oauth_callback,
    refresh_access_token,
    request_password_reset,
    signup_user,
    sync_user_profile,
    update_password,
    verify_token_and_update_password,
)

router = APIRouter()


@router.post(
    "/signup",
    status_code=status.HTTP_201_CREATED,
    response_model=SignUpResponse,
    summary="Sign up user via Supabase",
)
def signup(
    payload: SignUpRequest,
    session: Annotated[Session, Depends(get_db_session)],
) -> SignUpResponse:
    """Proxy Supabase sign-up and synchronise the local user record."""

    return signup_user(session=session, payload=payload)


@router.post(
    "/login",
    status_code=status.HTTP_200_OK,
    response_model=LoginResponse,
    summary="Login user via Supabase",
)
def login(
    payload: LoginRequest,
    session: Annotated[Session, Depends(get_db_session)],
) -> LoginResponse:
    """Authenticate user via Supabase and return session token."""

    return login_user(session=session, payload=payload)


@router.get(
    "/profile",
    response_model=UserProfileResponse,
    summary="Get current user profile",
)
def profile(
    user_id: Annotated[str, Depends(get_current_user_id)],
    session: Annotated[Session, Depends(get_authenticated_db_session)],
) -> UserProfileResponse:
    """Return the locally stored profile for the authenticated user."""

    return get_user_profile(session=session, user_id=user_id)


@router.post(
    "/profile/sync",
    response_model=UserProfileResponse,
    summary="Synchronise profile data from Supabase",
)
def sync_profile(
    user_id: Annotated[str, Depends(get_current_user_id)],
    session: Annotated[Session, Depends(get_authenticated_db_session)],
) -> UserProfileResponse:
    """Fetch Supabase profile information and persist it locally."""

    return sync_user_profile(session=session, user_id=user_id)


@router.post(
    "/refresh",
    status_code=status.HTTP_200_OK,
    response_model=SessionToken,
    summary="Refresh access token using refresh token",
)
def refresh_token(payload: RefreshTokenRequest) -> SessionToken:
    """Use refresh token to obtain new access token and refresh token."""

    return refresh_access_token(refresh_token=payload.refresh_token)


@router.post(
    "/password-reset",
    status_code=status.HTTP_200_OK,
    response_model=PasswordResetResponse,
    summary="Request password reset email",
)
def password_reset(payload: PasswordResetRequest) -> PasswordResetResponse:
    """Send password reset email to user. Returns success even if email doesn't exist (security best practice)."""

    return request_password_reset(payload=payload)


_bearer = HTTPBearer()


@router.post(
    "/password-update",
    status_code=status.HTTP_200_OK,
    response_model=UpdatePasswordResponse,
    summary="Update password with access token",
)
def password_update(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(_bearer)],
    payload: UpdatePasswordRequest,
) -> UpdatePasswordResponse:
    """Update user password. Requires valid access token (from reset email or current session)."""

    access_token = credentials.credentials
    return update_password(access_token=access_token, payload=payload)


@router.post(
    "/password-update-with-token",
    status_code=status.HTTP_200_OK,
    response_model=UpdatePasswordResponse,
    summary="Verify token and update password",
)
def password_update_with_token(
    payload: VerifyTokenAndUpdatePasswordRequest,
) -> UpdatePasswordResponse:
    """Verify token_hash from email and update password. No authentication required."""

    return verify_token_and_update_password(payload=payload)


@router.get(
    "/oauth/google",
    status_code=status.HTTP_200_OK,
    response_model=OAuthUrlResponse,
    summary="Get Google OAuth authorization URL",
)
def get_google_oauth_authorization_url(redirect_to: str | None = None) -> OAuthUrlResponse:
    """Return Google OAuth URL for client-side redirect flow."""

    return get_google_oauth_url(redirect_to=redirect_to)


@router.post(
    "/oauth/callback",
    status_code=status.HTTP_200_OK,
    response_model=OAuthCallbackResponse,
    summary="Process OAuth callback and sync user",
)
def oauth_callback(
    payload: OAuthCallbackRequest,
    session: Annotated[Session, Depends(get_db_session)],
) -> OAuthCallbackResponse:
    """Accept OAuth tokens and synchronize user to local database."""

    return process_oauth_callback(session=session, payload=payload)
