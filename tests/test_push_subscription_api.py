"""Tests for push subscription API endpoints."""

from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

import jwt
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models import PushSubscription, User


def _auth_headers(user_id: str) -> dict[str, str]:
    settings = get_settings()
    token = jwt.encode({"sub": user_id}, settings.supabase_jwt_secret, algorithm="HS256")
    return {"Authorization": f"Bearer {token}"}


def _create_user(session: Session) -> User:
    now = datetime.now()
    user = User(
        id=str(uuid4()),
        name="Push User",
        email=f"push-{uuid4()}@example.com",
        created_at=now,
        updated_at=now,
    )
    session.add(user)
    session.commit()
    return user


def test_register_push_subscription(client: TestClient, db_session: Session) -> None:
    user = _create_user(db_session)
    token = "ExponentPushToken[test-token]"

    response = client.post(
        "/api/v1/push-subscriptions",
        json={"expo_token": token},
        headers=_auth_headers(user.id),
    )

    assert response.status_code == 204
    stored = db_session.query(PushSubscription).filter_by(expo_token=token).one()
    assert stored.user_id == user.id


def test_register_push_subscription_upserts_existing(client: TestClient, db_session: Session) -> None:
    first_user = _create_user(db_session)
    second_user = _create_user(db_session)

    token = "ExponentPushToken[test-token]"
    db_session.add(PushSubscription(user_id=first_user.id, expo_token=token))
    db_session.commit()

    response = client.post(
        "/api/v1/push-subscriptions",
        json={"expo_token": token},
        headers=_auth_headers(second_user.id),
    )

    assert response.status_code == 204
    stored = db_session.query(PushSubscription).filter_by(expo_token=token).one()
    assert stored.user_id == second_user.id
