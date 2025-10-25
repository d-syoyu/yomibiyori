"""Tests for authentication-related API endpoints."""

from __future__ import annotations

from datetime import datetime, timezone
from types import SimpleNamespace
from uuid import uuid4

import jwt
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models import User
from app.services import auth as auth_service


class _DummyResponse:
    def __init__(self, status_code: int, payload: dict, headers: dict | None = None):
        self.status_code = status_code
        self._payload = payload
        self.headers = headers or {}

    def json(self) -> dict:
        return self._payload

    def raise_for_status(self) -> None:  # pragma: no cover - not used directly
        if self.status_code >= 400:
            raise RuntimeError("HTTP error")


def _bearer(user_id: str, role: str = "authenticated") -> dict[str, str]:
    settings = get_settings()
    token = jwt.encode({"sub": user_id, "role": role}, settings.supabase_jwt_secret, algorithm="HS256")
    return {"Authorization": f"Bearer {token}"}


def _create_user(session: Session, *, user_id: str | None = None, name: str = "Poet", email: str | None = None) -> User:
    now = datetime.now(timezone.utc)
    user = User(
        id=user_id or str(uuid4()),
        name=name,
        email=email or f"user-{uuid4()}@example.com",
        created_at=now,
        updated_at=now,
    )
    session.add(user)
    session.commit()
    return user


def test_signup_success(client: TestClient, db_session: Session, monkeypatch: pytest.MonkeyPatch) -> None:
    settings = get_settings()
    monkeypatch.setattr(settings, "supabase_anon_key", "anon-key")
    monkeypatch.setattr(settings, "supabase_request_timeout", 1.0)

    user_id = str(uuid4())
    response_payload = {
        "user": {
            "id": user_id,
            "email": "signup@example.com",
            "user_metadata": {"display_name": "New Poet"},
        },
        "session": {
            "access_token": "access-token",
            "refresh_token": "refresh-token",
            "token_type": "bearer",
            "expires_in": 3600,
        },
    }

    captured = SimpleNamespace(url=None, json=None, headers=None)

    def fake_post(url, json, headers, timeout):  # type: ignore[no-untyped-def]
        captured.url = url
        captured.json = json
        captured.headers = headers
        return _DummyResponse(201, response_payload, headers={"ETag": "W/example"})

    monkeypatch.setattr(auth_service.requests, "post", fake_post)

    response = client.post(
        "/api/v1/auth/signup",
        json={"email": "signup@example.com", "password": "SecurePass1!", "display_name": "New Poet"},
    )
    assert response.status_code == 201
    payload = response.json()
    assert payload["user_id"] == user_id
    assert payload["email"] == "signup@example.com"
    assert payload["display_name"] == "New Poet"
    assert payload["session"]["access_token"] == "access-token"
    assert captured.url.endswith("/auth/v1/signup")
    assert captured.json["data"]["display_name"] == "New Poet"
    assert captured.headers["apikey"] == "anon-key"

    stored = db_session.get(User, user_id)
    assert stored is not None
    assert stored.name == "New Poet"
    assert stored.email == "signup@example.com"


def test_signup_supabase_error_propagates(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    settings = get_settings()
    monkeypatch.setattr(settings, "supabase_anon_key", "anon-key")

    def fake_post(url, json, headers, timeout):  # type: ignore[no-untyped-def]
        return _DummyResponse(400, {"message": "User already registered"})

    monkeypatch.setattr(auth_service.requests, "post", fake_post)

    response = client.post(
        "/api/v1/auth/signup",
        json={"email": "duplicate@example.com", "password": "SecurePass1!", "display_name": "Duplicate Poet"},
    )
    assert response.status_code == 400
    assert response.json()["detail"] == "User already registered"


def test_get_profile_success(client: TestClient, db_session: Session) -> None:
    user = _create_user(db_session, name="Existing Poet", email="existing@example.com")
    response = client.get("/api/v1/auth/profile", headers=_bearer(user.id))
    assert response.status_code == 200
    payload = response.json()
    assert payload == {
        "user_id": user.id,
        "email": "existing@example.com",
        "display_name": "Existing Poet",
    }


def test_get_profile_missing(client: TestClient) -> None:
    response = client.get("/api/v1/auth/profile", headers=_bearer(str(uuid4())))
    assert response.status_code == 404
    assert response.json()["detail"] == "User profile not found"


def test_sync_profile_updates_local_record(
    client: TestClient,
    db_session: Session,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    settings = get_settings()
    monkeypatch.setattr(settings, "service_role_key", "service-role")
    monkeypatch.setattr(settings, "supabase_request_timeout", 1.0)

    user = _create_user(db_session, name="Old Name", email="sync@example.com")

    def fake_get(url, headers, timeout):  # type: ignore[no-untyped-def]
        assert headers["Authorization"] == "Bearer service-role"
        return _DummyResponse(
            200,
            {
                "id": user.id,
                "email": "sync@example.com",
                "user_metadata": {"display_name": "Refreshed Name"},
            },
        )

    monkeypatch.setattr(auth_service.requests, "get", fake_get)

    response = client.post("/api/v1/auth/profile/sync", headers=_bearer(user.id))
    assert response.status_code == 200
    payload = response.json()
    assert payload == {
        "user_id": user.id,
        "email": "sync@example.com",
        "display_name": "Refreshed Name",
    }

    updated = db_session.get(User, user.id)
    assert updated.name == "Refreshed Name"
