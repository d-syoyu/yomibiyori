"""Tests for notification token APIs."""

from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

import jwt
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models import NotificationToken, User


def _bearer(user_id: str, role: str = "authenticated") -> dict[str, str]:
    settings = get_settings()
    token = jwt.encode({"sub": user_id, "role": role}, settings.supabase_jwt_secret, algorithm="HS256")
    return {"Authorization": f"Bearer {token}"}


def _create_user(session: Session, *, email: str = "push@example.com") -> User:
    now = datetime.now(timezone.utc)
    user = User(
        id=str(uuid4()),
        name="Push User",
        email=email,
        created_at=now,
        updated_at=now,
    )
    session.add(user)
    session.commit()
    return user


def test_register_notification_token_creates_record(client: TestClient, db_session: Session) -> None:
    user = _create_user(db_session)
    response = client.post(
        "/api/v1/notifications/tokens",
        headers=_bearer(user.id),
        json={
            "expo_push_token": "ExponentPushToken[abcdef]",
            "platform": "ios",
            "device_id": "iPhone",
            "app_version": "1.0.0",
        },
    )
    assert response.status_code == 201
    payload = response.json()
    assert payload["expo_push_token"] == "ExponentPushToken[abcdef]"
    assert payload["platform"] == "ios"
    assert payload["is_active"] is True

    stored = db_session.query(NotificationToken).one()
    assert stored.user_id == user.id
    assert stored.device_id == "iPhone"


def test_register_notification_token_reassigns_existing(client: TestClient, db_session: Session) -> None:
    user_one = _create_user(db_session, email="first@example.com")
    user_two = _create_user(db_session, email="second@example.com")

    token = NotificationToken(
        id=str(uuid4()),
        user_id=user_one.id,
        expo_push_token="ExponentPushToken[shared]",
        device_id="Old Device",
        platform="android",
        is_active=False,
        last_registered_at=datetime.now(timezone.utc),
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db_session.add(token)
    db_session.commit()

    response = client.post(
        "/api/v1/notifications/tokens",
        headers=_bearer(user_two.id),
        json={
            "expo_push_token": "ExponentPushToken[shared]",
            "platform": "android",
            "device_id": "Pixel",
        },
    )
    assert response.status_code == 201
    payload = response.json()
    assert payload["device_id"] == "Pixel"
    assert payload["is_active"] is True

    db_session.refresh(token)
    assert token.user_id == user_two.id
    assert token.is_active is True


@pytest.mark.parametrize(
    "token_value",
    [
        "invalid-token",
        "",
        "ExponentPushToken",
    ],
)
def test_register_notification_token_validates_prefix(
    client: TestClient,
    db_session: Session,
    token_value: str,
) -> None:
    user = _create_user(db_session)
    response = client.post(
        "/api/v1/notifications/tokens",
        headers=_bearer(user.id),
        json={"expo_push_token": token_value},
    )
    assert response.status_code == 422
