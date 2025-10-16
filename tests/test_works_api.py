"""Tests for works API."""

from __future__ import annotations

from datetime import date, datetime, timezone
from uuid import uuid4

import jwt
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models import Theme, User, Work
from app.services import works as works_service


def _create_user(session: Session) -> User:
    now = datetime.now(timezone.utc)
    user = User(
        id=str(uuid4()),
        handle="testuser",
        display_name="Test User",
        bio=None,
        created_at=now,
        updated_at=now,
    )
    session.add(user)
    session.commit()
    return user


def _create_theme(session: Session, theme_date: date) -> Theme:
    theme = Theme(
        id=str(uuid4()),
        text="春風と踊る桜のささやき",
        category="general",
        date=theme_date,
        sponsored=False,
        created_at=datetime.now(timezone.utc),
    )
    session.add(theme)
    session.commit()
    return theme


def _auth_headers(user_id: str) -> dict[str, str]:
    settings = get_settings()
    token = jwt.encode({"sub": user_id}, settings.supabase_jwt_secret, algorithm="HS256")
    return {"Authorization": f"Bearer {token}"}


def test_submit_work_success(client: TestClient, db_session: Session, monkeypatch: pytest.MonkeyPatch) -> None:
    user = _create_user(db_session)
    theme = _create_theme(db_session, theme_date=date(2025, 1, 15))

    monkeypatch.setattr(works_service, "_current_theme_for_submission", lambda session: theme)

    response = client.post(
        "/api/v1/works",
        json={"text": "夕茜こぼす筆先のひと雫"},
        headers=_auth_headers(user.id),
    )

    assert response.status_code == 201
    payload = response.json()
    assert payload["user_id"] == user.id
    assert payload["theme_id"] == theme.id
    assert payload["text"] == "夕茜こぼす筆先のひと雫"
    assert payload["likes_count"] == 0

    stored_work = db_session.query(Work).one()
    assert stored_work.text == "夕茜こぼす筆先のひと雫"


def test_submit_work_conflict(client: TestClient, db_session: Session, monkeypatch: pytest.MonkeyPatch) -> None:
    user = _create_user(db_session)
    theme = _create_theme(db_session, theme_date=date(2025, 1, 16))
    monkeypatch.setattr(works_service, "_current_theme_for_submission", lambda session: theme)

    headers = _auth_headers(user.id)
    first = client.post(
        "/api/v1/works",
        json={"text": "月影に凪ぐ想いを託す"},
        headers=headers,
    )
    assert first.status_code == 201

    second = client.post(
        "/api/v1/works",
        json={"text": "月影に凪ぐ想いを託す"},
        headers=headers,
    )
    assert second.status_code == 409
    assert second.json()["detail"].startswith("You have already")


def test_list_works_returns_likes_count(client: TestClient, db_session: Session, monkeypatch: pytest.MonkeyPatch) -> None:
    user = _create_user(db_session)
    theme = _create_theme(db_session, theme_date=date(2025, 1, 17))
    monkeypatch.setattr(works_service, "_current_theme_for_submission", lambda session: theme)

    headers = _auth_headers(user.id)
    client.post(
        "/api/v1/works",
        json={"text": "朝露が紡ぐ音色のひかり"},
        headers=headers,
    )

    response = client.get(f"/api/v1/works?theme_id={theme.id}")
    assert response.status_code == 200
    works = response.json()
    assert len(works) == 1
    assert works[0]["theme_id"] == theme.id
    assert works[0]["likes_count"] == 0
