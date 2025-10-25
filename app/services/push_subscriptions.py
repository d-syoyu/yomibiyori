"""Domain helpers for managing Expo push notification subscriptions."""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import PushSubscription


def register_push_token(session: Session, *, user_id: str, expo_token: str) -> None:
    """Register or update an Expo push token for the supplied user.

    If the token already exists, it will be reassigned to the new user and the timestamp refreshed.
    """

    existing = session.execute(
        select(PushSubscription).where(PushSubscription.expo_token == expo_token)
    ).scalar_one_or_none()

    now = datetime.now(timezone.utc)
    if existing:
        existing.user_id = user_id
        existing.created_at = now
    else:
        session.add(
            PushSubscription(
                user_id=user_id,
                expo_token=expo_token,
                created_at=now,
            )
        )

    session.commit()
