"""Routes for Supabase authentication management."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, status, UploadFile, File
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.services.storage import get_storage_service

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
    UpdateProfileRequest,
    UserProfileResponse,
    VerifyTokenAndUpdatePasswordRequest,
)
from app.services.auth import (
    delete_user_account,
    get_apple_oauth_url,
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
    update_user_profile,
    verify_token_and_update_password,
)
from app.models.user import User
from fastapi import HTTPException

router = APIRouter()


def get_current_sponsor(
    user_id: Annotated[str, Depends(get_current_user_id)],
    session: Annotated[Session, Depends(get_authenticated_db_session)],
) -> User:
    """Get current user and verify they have sponsor role.

    Raises HTTPException if user is not a sponsor.
    """
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    if user.role != "sponsor":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This endpoint is only available to sponsors",
        )

    return user


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


@router.patch(
    "/profile",
    response_model=UserProfileResponse,
    summary="Update user profile",
)
def update_profile(
    payload: UpdateProfileRequest,
    user_id: Annotated[str, Depends(get_current_user_id)],
    session: Annotated[Session, Depends(get_authenticated_db_session)],
) -> UserProfileResponse:
    """Update the authenticated user's profile (e.g., display name)."""

    return update_user_profile(session=session, user_id=user_id, payload=payload)


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


@router.get(
    "/oauth/apple",
    status_code=status.HTTP_200_OK,
    response_model=OAuthUrlResponse,
    summary="Get Apple OAuth authorization URL",
)
def get_apple_oauth_authorization_url(redirect_to: str | None = None) -> OAuthUrlResponse:
    """Return Apple OAuth URL for client-side redirect flow."""

    return get_apple_oauth_url(redirect_to=redirect_to)


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


@router.delete(
    "/profile",
    status_code=status.HTTP_204_NO_CONTENT,
    response_model=None,
    summary="Delete user account",
)
def delete_account(
    user_id: Annotated[str, Depends(get_current_user_id)],
    session: Annotated[Session, Depends(get_authenticated_db_session)],
) -> None:
    """Delete the authenticated user's account and all associated data."""

    delete_user_account(session=session, user_id=user_id)


@router.post(
    "/profile/avatar",
    status_code=status.HTTP_200_OK,
    summary="Upload profile avatar image",
)
async def upload_avatar(
    file: Annotated[UploadFile, File(description="Avatar image file (JPEG, PNG, WebP)")],
    user_id: Annotated[str, Depends(get_current_user_id)],
    session: Annotated[Session, Depends(get_authenticated_db_session)],
) -> dict[str, str]:
    """Upload and set user's profile avatar image.

    - Accepts JPEG, PNG, or WebP images
    - Maximum file size: 5MB
    - Image will be resized to 256x256 and converted to JPEG
    """
    storage = get_storage_service()

    # Read file content
    content = await file.read()

    # Upload to R2
    profile_image_url = storage.upload_avatar(
        user_id=user_id,
        file_content=content,
        content_type=file.content_type or "image/jpeg",
    )

    # Update user's profile_image_url in database
    user = session.get(User, user_id)
    if user:
        # Delete old avatar if exists
        if user.profile_image_url:
            storage.delete_avatar(user.profile_image_url)
        user.profile_image_url = profile_image_url
        session.commit()

    return {"profile_image_url": profile_image_url}
