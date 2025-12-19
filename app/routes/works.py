"""Routes for works resource."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from redis import Redis
from sqlalchemy.orm import Session

from app.core.redis import get_redis_client
from app.db.session import get_authenticated_db_session, get_db_session
from app.services.auth import get_optional_user_id
from app.schemas.work import (
    WorkCreate,
    WorkDateSummary,
    WorkImpressionRequest,
    WorkImpressionResponse,
    WorkLikeBatchRequest,
    WorkLikeBatchResponse,
    WorkLikeResponse,
    WorkLikeStatusResponse,
    WorkResponse,
    WorkUpdate,
)
from app.services import likes as likes_service
from app.services import works as works_service
from app.services.auth import get_current_user_id

router = APIRouter()


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    response_model=WorkResponse,
    summary="Submit a new work",
)
def submit_work(
    payload: WorkCreate,
    user_id: Annotated[str, Depends(get_current_user_id)],
    session: Annotated[Session, Depends(get_authenticated_db_session)],
    redis_client: Annotated[Redis, Depends(get_redis_client)],
) -> WorkResponse:
    """Create a work for the authenticated user.

    A user may submit at most one work for the active theme in the current day.
    """

    return works_service.create_work(session=session, user_id=user_id, payload=payload, redis_client=redis_client)


@router.get(
    "",
    response_model=list[WorkResponse],
    summary="List works for a theme",
)
def list_works(
    theme_id: Annotated[str, Query(description="Theme identifier")],
    session: Annotated[Session, Depends(get_db_session)],
    current_user_id: Annotated[str | None, Depends(get_optional_user_id)],
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
    order_by: Annotated[str, Query(description="Sort order: 'recent' or 'fair_score'")] = "recent",
) -> list[WorkResponse]:
    """Return works tied to the requested theme.

    Sort order:
    - 'recent': Newest first (default)
    - 'fair_score': Time-normalized score (balances good older works with newer works)

    If the user is authenticated, their own works are excluded from the results.
    """

    return works_service.list_works(
        session=session,
        theme_id=theme_id,
        limit=limit,
        order_by=order_by,
        exclude_user_id=current_user_id,
    )


@router.get(
    "/me/summary",
    response_model=list[WorkDateSummary],
    summary="Get summary of user's works grouped by date",
)
def get_my_works_summary(
    user_id: Annotated[str, Depends(get_current_user_id)],
    session: Annotated[Session, Depends(get_authenticated_db_session)],
) -> list[WorkDateSummary]:
    """Return summary of works grouped by theme date.

    Returns a list of dates with work counts and total likes for each date.
    Useful for displaying an accordion-style view of works by date.
    """

    return works_service.get_my_works_summary(session=session, user_id=user_id)


@router.get(
    "/me",
    response_model=list[WorkResponse],
    summary="List works by authenticated user",
)
def list_my_works(
    user_id: Annotated[str, Depends(get_current_user_id)],
    session: Annotated[Session, Depends(get_authenticated_db_session)],
    theme_id: Annotated[str | None, Query(description="Optional theme filter")] = None,
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> list[WorkResponse]:
    """Return works created by the authenticated user.

    Supports optional filtering by theme and pagination.
    """

    return works_service.list_my_works(
        session=session,
        user_id=user_id,
        theme_id=theme_id,
        limit=limit,
        offset=offset,
    )


@router.post(
    "/like/status/batch",
    response_model=WorkLikeBatchResponse,
    summary="Get like status for multiple works",
)
def get_like_status_batch(
    payload: WorkLikeBatchRequest,
    user_id: Annotated[str, Depends(get_current_user_id)],
    session: Annotated[Session, Depends(get_authenticated_db_session)],
) -> WorkLikeBatchResponse:
    """Get like status for multiple works at once."""

    return likes_service.get_like_status_batch(
        session=session,
        user_id=user_id,
        work_ids=payload.work_ids,
    )


@router.post(
    "/{work_id}/like",
    response_model=WorkLikeResponse,
    summary="Toggle like (kansha) for a work",
)
def toggle_like(
    work_id: str,
    user_id: Annotated[str, Depends(get_current_user_id)],
    session: Annotated[Session, Depends(get_authenticated_db_session)],
    redis_client: Annotated[Redis, Depends(get_redis_client)],
) -> WorkLikeResponse:
    """Toggle like status for the target work. If already liked, unlike it. Otherwise, like it."""

    return likes_service.toggle_like(
        session=session,
        redis_client=redis_client,
        user_id=user_id,
        work_id=work_id,
    )


@router.get(
    "/{work_id}/like/status",
    response_model=WorkLikeStatusResponse,
    summary="Get like status for a work",
)
def get_like_status(
    work_id: str,
    user_id: Annotated[str, Depends(get_current_user_id)],
    session: Annotated[Session, Depends(get_authenticated_db_session)],
) -> WorkLikeStatusResponse:
    """Get whether the current user has liked the work and the total like count."""

    return likes_service.get_like_status(
        session=session,
        user_id=user_id,
        work_id=work_id,
    )


@router.post(
    "/{work_id}/impression",
    response_model=WorkImpressionResponse,
    summary="Record impression for a work",
)
def record_work_impression(
    work_id: str,
    payload: WorkImpressionRequest,
    session: Annotated[Session, Depends(get_db_session)],
    redis_client: Annotated[Redis, Depends(get_redis_client)],
) -> WorkImpressionResponse:
    """Track impressions for ranking adjustments."""

    return works_service.record_impression(
        session=session,
        redis_client=redis_client,
        work_id=work_id,
        payload=payload,
    )


@router.put(
    "/{work_id}",
    response_model=WorkResponse,
    summary="Update a work",
)
def update_work(
    work_id: str,
    payload: WorkUpdate,
    user_id: Annotated[str, Depends(get_current_user_id)],
    session: Annotated[Session, Depends(get_authenticated_db_session)],
) -> WorkResponse:
    """Update the text of an existing work owned by the authenticated user.

    Only the owner can update their work. Likes and metrics are preserved.
    """

    return works_service.update_work(
        session=session,
        user_id=user_id,
        work_id=work_id,
        payload=payload,
    )


@router.delete(
    "/{work_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a work",
)
def delete_work(
    work_id: str,
    user_id: Annotated[str, Depends(get_current_user_id)],
    session: Annotated[Session, Depends(get_authenticated_db_session)],
    redis_client: Annotated[Redis, Depends(get_redis_client)],
) -> None:
    """Delete a work owned by the authenticated user.

    This removes the work from the database and cleans up related data
    including likes, ranking entries (both Redis and confirmed snapshots).
    """

    works_service.delete_work(
        session=session,
        redis_client=redis_client,
        user_id=user_id,
        work_id=work_id,
    )
