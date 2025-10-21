"""Routes for Supabase authentication management."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.db.session import get_db_session
from app.schemas.auth import SignUpRequest, SignUpResponse, UserProfileResponse
from app.services.auth import (
    get_current_user_id,
    get_user_profile,
    signup_user,
    sync_user_profile,
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


@router.get(
    "/profile",
    response_model=UserProfileResponse,
    summary="Get current user profile",
)
def profile(
    session: Annotated[Session, Depends(get_db_session)],
    user_id: Annotated[str, Depends(get_current_user_id)],
) -> UserProfileResponse:
    """Return the locally stored profile for the authenticated user."""

    return get_user_profile(session=session, user_id=user_id)


@router.post(
    "/profile/sync",
    response_model=UserProfileResponse,
    summary="Synchronise profile data from Supabase",
)
def sync_profile(
    session: Annotated[Session, Depends(get_db_session)],
    user_id: Annotated[str, Depends(get_current_user_id)],
) -> UserProfileResponse:
    """Fetch Supabase profile information and persist it locally."""

    return sync_user_profile(session=session, user_id=user_id)
