"""Routes for public user profile endpoints."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.db.session import get_db_session
from app.schemas.work import WorkDateSummary, WorkResponse
from app.services.users import (
    get_user_public_profile,
    get_user_works,
    get_user_works_summary,
)

router = APIRouter()


class PublicUserProfile(BaseModel):
    """Public user profile response schema."""

    user_id: str = Field(..., description="User identifier")
    display_name: str = Field(..., description="User's display name")
    profile_image_url: str | None = Field(None, description="URL of user's profile image")
    works_count: int = Field(..., description="Total number of works by this user")
    total_likes: int = Field(..., description="Total likes received across all works")


@router.get(
    "/{user_id}/profile",
    response_model=PublicUserProfile,
    summary="Get public user profile",
)
def get_profile(
    user_id: str,
    session: Annotated[Session, Depends(get_db_session)],
) -> PublicUserProfile:
    """Return public profile information for a user."""

    profile = get_user_public_profile(session=session, user_id=user_id)
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="ユーザーが見つかりませんでした",
        )

    return PublicUserProfile(**profile)


@router.get(
    "/{user_id}/works",
    response_model=list[WorkResponse],
    summary="Get user's works",
)
def list_user_works(
    user_id: str,
    session: Annotated[Session, Depends(get_db_session)],
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> list[WorkResponse]:
    """Return works created by the specified user."""

    return get_user_works(session=session, user_id=user_id, limit=limit, offset=offset)


@router.get(
    "/{user_id}/works/summary",
    response_model=list[WorkDateSummary],
    summary="Get user's works summary by date",
)
def get_works_summary(
    user_id: str,
    session: Annotated[Session, Depends(get_db_session)],
) -> list[WorkDateSummary]:
    """Return summary of works grouped by theme date for the user."""

    return get_user_works_summary(session=session, user_id=user_id)
