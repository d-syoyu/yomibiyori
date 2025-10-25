"""Routes for managing push notification subscriptions."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, status, Response
from sqlalchemy.orm import Session

from app.db.session import get_authenticated_db_session
from app.schemas.push import PushSubscriptionCreate
from app.services.push_subscriptions import register_push_token
from app.services.auth import get_current_user_id

router = APIRouter()


@router.post(
    "",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Register Expo push token for the authenticated user",
)
def register_push_subscription(
    payload: PushSubscriptionCreate,
    user_id: Annotated[str, Depends(get_current_user_id)],
    session: Annotated[Session, Depends(get_authenticated_db_session)],
) -> Response:
    """Upsert an Expo push token so the user can receive notifications."""

    register_push_token(session=session, user_id=user_id, expo_token=payload.expo_token)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
