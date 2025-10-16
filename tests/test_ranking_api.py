
"""Tests for ranking API."""

from __future__ import annotations

from datetime import date, datetime, timezone
from decimal import Decimal
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import Ranking, Theme, User, Work


def _create_user(session: Session) -> User:
    now = datetime.now(timezone.utc)
    user = User(
        id=str(uuid4()),
        handle="ranking_user",
        display_name="Ranking User",
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
        text="秋蛍 澄む夜気に揺れ",
        category="general",
        date=theme_date,
        sponsored=False,
        created_at=datetime.now(timezone.utc),
    )
    session.add(theme)
    session.commit()
    return theme


def _create_work(session: Session, user: User, theme: Theme, text: str) -> Work:
    now = datetime.now(timezone.utc)
    work = Work(
        id=str(uuid4()),
        user_id=user.id,
        theme_id=theme.id,
        text=text,
        created_at=now,
        updated_at=now,
    )
    session.add(work)
    session.commit()
    return work


def test_get_ranking_success(client: TestClient, db_session: Session) -> None:
    user = _create_user(db_session)
    theme = _create_theme(db_session, date(2025, 1, 20))
    work = _create_work(db_session, user, theme, "銀河へと跳ねる露珠のひらめき")

    ranking_entry = Ranking(
        theme_id=theme.id,
        work_id=work.id,
        score=Decimal("0.84210"),
        rank=1,
        snapshot_time=datetime.now(timezone.utc),
    )
    db_session.add(ranking_entry)
    db_session.commit()

    response = client.get(f"/api/v1/ranking?theme_id={theme.id}")

    assert response.status_code == 200
    payload = response.json()
    assert len(payload) == 1
    assert payload[0]["rank"] == 1
    assert payload[0]["work_id"] == work.id
    assert pytest.approx(payload[0]["score"], rel=1e-3) == float(ranking_entry.score)
    assert payload[0]["user_name"] == user.display_name
    assert payload[0]["text"] == work.text


def test_get_ranking_theme_not_found(client: TestClient) -> None:
    response = client.get("/api/v1/ranking?theme_id=missing")
    assert response.status_code == 404


def test_get_ranking_without_entries(client: TestClient, db_session: Session) -> None:
    theme = _create_theme(db_session, date(2025, 1, 21))
    response = client.get(f"/api/v1/ranking?theme_id={theme.id}")
    assert response.status_code == 404
