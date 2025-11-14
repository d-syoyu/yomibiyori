"""Notification-related API routes."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.db.session import get_authenticated_db_session
from app.schemas import NotificationTokenCreate, NotificationTokenResponse
from app.services.auth import get_current_user_id
from app.services.notifications import register_notification_token

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.post(
    "/tokens",
    status_code=status.HTTP_201_CREATED,
    response_model=NotificationTokenResponse,
    summary="Register Expo push token",
)
def register_push_token(
    payload: NotificationTokenCreate,
    user_id: Annotated[str, Depends(get_current_user_id)],
    session: Annotated[Session, Depends(get_authenticated_db_session)],
) -> NotificationTokenResponse:
    """Register or update an Expo push notification token for the current user."""

    return register_notification_token(session, user_id=user_id, payload=payload)
