"""Routes for works resource."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db_session
from app.schemas.work import WorkCreate, WorkResponse
from app.services.auth import get_current_user_id
from app.services import works as works_service

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
