"""Tests for ranking API."""

from __future__ import annotations

from datetime import date, datetime, timezone
from decimal import Decimal
from math import sqrt
from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models import Ranking, Theme, User, Work
from app.services import ranking as ranking_service


def _create_user(session: Session) -> User:
    now = datetime.now(timezone.utc)
    user = User(
        id=str(uuid4()),
        name="Ranking User",
        email=f"ranking-{uuid4()}@example.com",
        created_at=now,
        updated_at=now,
    )
    session.add(user)
    session.commit()
    return user


def _create_theme(session: Session, theme_date: date) -> Theme:
    theme = Theme(
        id=str(uuid4()),
        text="Wind traces a playful dance tonight",
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


def _wilson(likes: int, impressions: int, z: float = 1.96) -> float:
    if impressions <= 0:
        return 0.0
    phat = likes / impressions
    denominator = 1.0 + (z * z) / impressions
    centre = phat + (z * z) / (2 * impressions)
    margin = z * sqrt((phat * (1 - phat) + (z * z) / (4 * impressions)) / impressions)
    return (centre - margin) / denominator


def test_get_ranking_success(
    client: TestClient,
    db_session: Session,
    redis_client,
) -> None:
    user = _create_user(db_session)
    theme = _create_theme(db_session, date(2025, 1, 20))
    work = _create_work(db_session, user, theme, "Evening lamps glitter along the pier")

    settings = get_settings()
    redis_client.zadd(f"{settings.redis_ranking_prefix}{theme.id}", {work.id: 12})
    redis_client.hset(f"metrics:{work.id}", mapping={"likes": 12, "impressions": 30})

    expected_candidate = ranking_service._build_candidates(redis_client, theme.id, 1)[0]
    expected_score = expected_candidate.adjusted_score * ranking_service._calculate_time_normalization_factor(work.created_at)

    response = client.get(f"/api/v1/ranking?theme_id={theme.id}")

    assert response.status_code == 200
    payload = response.json()
    assert len(payload) == 1
    assert payload[0]["rank"] == 1
    assert payload[0]["work_id"] == work.id
    assert pytest.approx(payload[0]["score"], rel=1e-6) == expected_score
    assert payload[0]["display_name"] == user.name
    assert payload[0]["text"] == work.text


def test_get_ranking_uses_unique_viewers(
    client: TestClient,
    db_session: Session,
    redis_client,
) -> None:
    user = _create_user(db_session)
    theme = _create_theme(db_session, date(2025, 1, 20))
    work = _create_work(db_session, user, theme, "Harbor lanterns guide a hush of sails")

    settings = get_settings()
    redis_client.zadd(f"{settings.redis_ranking_prefix}{theme.id}", {work.id: 8})
    redis_client.hset(
        f"metrics:{work.id}",
        mapping={"likes": 8, "impressions": 10, "unique_viewers": 40},
    )

    expected_candidate = ranking_service._build_candidates(redis_client, theme.id, 1)[0]
    expected_score = expected_candidate.adjusted_score * ranking_service._calculate_time_normalization_factor(work.created_at)

    response = client.get(f"/api/v1/ranking?theme_id={theme.id}")
    assert response.status_code == 200
    payload = response.json()
    assert len(payload) == 1
    assert pytest.approx(payload[0]["score"], rel=1e-6) == expected_score
    assert payload[0]["display_name"] == user.name
    assert payload[0]["text"] == work.text


def test_get_ranking_fallback_to_snapshot(client: TestClient, db_session: Session) -> None:
    user = _create_user(db_session)
    theme = _create_theme(db_session, date(2025, 1, 22))
    work = _create_work(db_session, user, theme, "Snowlight crowns the silent harbor bell")

    ranking_entry = Ranking(
        theme_id=UUID(theme.id),
        work_id=UUID(work.id),
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
    assert pytest.approx(payload[0]["score"], rel=1e-6) == float(ranking_entry.score)
    assert payload[0]["display_name"] == user.name
    assert payload[0]["text"] == work.text


def test_get_ranking_theme_not_found(client: TestClient) -> None:
    response = client.get("/api/v1/ranking?theme_id=missing")
    assert response.status_code == 404


def test_get_ranking_without_entries(
    client: TestClient,
    db_session: Session,
) -> None:
    theme = _create_theme(db_session, date(2025, 1, 21))
    response = client.get(f"/api/v1/ranking?theme_id={theme.id}")
    assert response.status_code == 404
