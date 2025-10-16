"""Routes for works resource."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from redis import Redis
from sqlalchemy.orm import Session

from app.core.redis import get_redis_client
from app.db.session import get_db_session
from app.schemas.work import WorkCreate, WorkImpressionResponse, WorkLikeResponse, WorkResponse
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
    session: Annotated[Session, Depends(get_db_session)],
    user_id: Annotated[str, Depends(get_current_user_id)],
) -> WorkResponse:
    """Create a work for the authenticated user.

    A user may submit at most one work for the active theme in the current day.
    """

    return works_service.create_work(session=session, user_id=user_id, payload=payload)


@router.get(
    "",
    response_model=list[WorkResponse],
    summary="List works for a theme",
)
def list_works(
    theme_id: Annotated[str, Query(description="Theme identifier")],
    session: Annotated[Session, Depends(get_db_session)],
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
) -> list[WorkResponse]:
    """Return works tied to the requested theme ordered by recency."""

    return works_service.list_works(session=session, theme_id=theme_id, limit=limit)


@router.post(
    "/{work_id}/like",
    response_model=WorkLikeResponse,
    summary="Send like (kansha) to a work",
)
def like_work(
    work_id: str,
    session: Annotated[Session, Depends(get_db_session)],
    redis_client: Annotated[Redis, Depends(get_redis_client)],
    user_id: Annotated[str, Depends(get_current_user_id)],
) -> WorkLikeResponse:
    """Register a like for the target work on behalf of the authenticated user."""

    return likes_service.like_work(
        session=session,
        redis_client=redis_client,
        user_id=user_id,
        work_id=work_id,
    )


@router.post(
    "/{work_id}/impression",
    status_code=status.HTTP_202_ACCEPTED,
    response_model=WorkImpressionResponse,
    summary="Record an impression for a work",
)
def record_impression(
    work_id: str,
    session: Annotated[Session, Depends(get_db_session)],
    redis_client: Annotated[Redis, Depends(get_redis_client)],
) -> WorkImpressionResponse:
    """Increment impression count for the target work."""

    return works_service.record_impression(
        session=session,
        redis_client=redis_client,
        work_id=work_id,
    )
