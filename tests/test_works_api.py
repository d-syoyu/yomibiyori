"""Tests for works API."""

from __future__ import annotations

from datetime import date, datetime, timezone
from uuid import uuid4

import jwt
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models import Like, Theme, User, Work
from app.services import works as works_service


def _create_user(session: Session) -> User:
    now = datetime.now(timezone.utc)
    user = User(
        id=str(uuid4()),
        handle=f"testuser-{uuid4()}",
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


def test_like_work_success(
    client: TestClient,
    db_session: Session,
    redis_client,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    author = _create_user(db_session)
    liker = _create_user(db_session)
    theme = _create_theme(db_session, theme_date=date(2025, 1, 18))

    monkeypatch.setattr(works_service, "_current_theme_for_submission", lambda session: theme)
    creation = client.post(
        "/api/v1/works",
        json={"text": "�����̐l�ɓ���̕��ɓ����"},
        headers=_auth_headers(author.id),
    )
    work_id = creation.json()["id"]

    response = client.post(
        f"/api/v1/works/{work_id}/like",
        headers=_auth_headers(liker.id),
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "liked"
    assert payload["likes_count"] == 1

    assert db_session.query(Like).count() == 1
    settings = get_settings()
    ranking_key = f"{settings.redis_ranking_prefix}{theme.id}"
    assert redis_client.zscore(ranking_key, work_id) == 1.0
    assert redis_client.hget(f"metrics:{work_id}", "likes") == "1"


def test_like_work_conflict(
    client: TestClient,
    db_session: Session,
    redis_client,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    user = _create_user(db_session)
    theme = _create_theme(db_session, theme_date=date(2025, 1, 19))
    monkeypatch.setattr(works_service, "_current_theme_for_submission", lambda session: theme)

    creation = client.post(
        "/api/v1/works",
        json={"text": "���̌��̓G���b�g�̃o���q"},
        headers=_auth_headers(user.id),
    )
    work_id = creation.json()["id"]

    first = client.post(
        f"/api/v1/works/{work_id}/like",
        headers=_auth_headers(user.id),
    )
    assert first.status_code == 200

    second = client.post(
        f"/api/v1/works/{work_id}/like",
        headers=_auth_headers(user.id),
    )
    assert second.status_code == 409
    assert second.json()["detail"].startswith("You have already")
