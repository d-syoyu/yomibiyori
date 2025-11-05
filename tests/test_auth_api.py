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
    assert response.json()["error"]["detail"] == "User already registered"


def test_get_profile_success(client: TestClient, db_session: Session) -> None:
    user = _create_user(db_session, name="Existing Poet", email="existing@example.com")
    response = client.get("/api/v1/auth/profile", headers=_bearer(user.id))
    assert response.status_code == 200
    payload = response.json()
    assert payload["user_id"] == user.id
    assert payload["email"] == "existing@example.com"
    assert payload["display_name"] == "Existing Poet"
    assert payload["analytics_opt_out"] is False
    assert payload["birth_year"] is None
    assert payload["prefecture"] is None
    assert payload["device_info"] is None


def test_get_profile_missing(client: TestClient) -> None:
    response = client.get("/api/v1/auth/profile", headers=_bearer(str(uuid4())))
    assert response.status_code == 404
    assert response.json()["error"]["detail"] == "User profile not found"


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
    assert payload["user_id"] == user.id
    assert payload["email"] == "sync@example.com"
    assert payload["display_name"] == "Refreshed Name"

    updated = db_session.get(User, user.id)
    assert updated.name == "Refreshed Name"


def test_password_reset_requests_supabase(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    settings = get_settings()
    monkeypatch.setattr(settings, "supabase_anon_key", "anon-key")
    monkeypatch.setattr(settings, "supabase_request_timeout", 1.0)

    captured = SimpleNamespace(url=None, payload=None, headers=None)

    def fake_post(url, json, headers, timeout):  # type: ignore[no-untyped-def]
        captured.url = url
        captured.payload = json
        captured.headers = headers
        return _DummyResponse(200, {})

    monkeypatch.setattr(auth_service.requests, "post", fake_post)

    response = client.post("/api/v1/auth/password-reset", json={"email": "reset@example.com"})
    assert response.status_code == 200
    assert response.json()["message"] == "パスワード再設定メールを送信しました"
    assert captured.url.endswith("/auth/v1/recover")
    assert captured.payload == {"email": "reset@example.com"}
    assert captured.headers["apikey"] == "anon-key"
    assert captured.headers["Authorization"] == "Bearer anon-key"


def test_password_update_uses_bearer_token(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    settings = get_settings()
    monkeypatch.setattr(settings, "supabase_anon_key", "anon-key")
    monkeypatch.setattr(settings, "supabase_request_timeout", 1.0)

    captured = SimpleNamespace(url=None, payload=None, headers=None)

    def fake_put(url, json, headers, timeout):  # type: ignore[no-untyped-def]
        captured.url = url
        captured.payload = json
        captured.headers = headers
        return _DummyResponse(200, {})

    monkeypatch.setattr(auth_service.requests, "put", fake_put)

    response = client.post(
        "/api/v1/auth/password-update",
        headers={"Authorization": "Bearer session-token"},
        json={"new_password": "ResetPass123"},
    )
    assert response.status_code == 200
    assert response.json()["message"] == "パスワードを更新しました"
    assert captured.url.endswith("/auth/v1/user")
    assert captured.payload == {"password": "ResetPass123"}
    assert captured.headers["Authorization"] == "Bearer session-token"
    assert captured.headers["apikey"] == "anon-key"


def test_password_update_with_recovery_token_success(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    settings = get_settings()
    monkeypatch.setattr(settings, "supabase_anon_key", "anon-key")
    monkeypatch.setattr(settings, "supabase_request_timeout", 1.0)

    captured = SimpleNamespace(
        verify_url=None,
        verify_payload=None,
        update_url=None,
        update_payload=None,
        update_headers=None,
    )

    def fake_post(url, json, headers, timeout):  # type: ignore[no-untyped-def]
        captured.verify_url = url
        captured.verify_payload = json
        return _DummyResponse(200, {"access_token": "verified-access-token"})

    def fake_put(url, json, headers, timeout):  # type: ignore[no-untyped-def]
        captured.update_url = url
        captured.update_payload = json
        captured.update_headers = headers
        return _DummyResponse(200, {})

    monkeypatch.setattr(auth_service.requests, "post", fake_post)
    monkeypatch.setattr(auth_service.requests, "put", fake_put)

    response = client.post(
        "/api/v1/auth/password-update-with-token",
        json={"access_token": "recovery-token-hash", "new_password": "NewPass123"},
    )

    assert response.status_code == 200
    assert response.json()["message"] == "パスワードを更新しました"
    assert captured.verify_url.endswith("/auth/v1/verify")
    assert captured.verify_payload == {"token_hash": "recovery-token-hash", "type": "recovery"}
    assert captured.update_url.endswith("/auth/v1/user")
    assert captured.update_payload == {"password": "NewPass123"}
    assert captured.update_headers["Authorization"] == "Bearer verified-access-token"
    assert captured.update_headers["apikey"] == "anon-key"
