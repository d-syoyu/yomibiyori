"""Tests for ranking finalisation service."""

from __future__ import annotations

from datetime import date, datetime, timezone
from decimal import Decimal, ROUND_HALF_UP
from uuid import uuid4

import pytest
from redis import Redis
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models import Ranking, Theme, User, Work
from app.services.ranking_finalization import finalize_rankings_for_date
from app.services.ranking import wilson_lower_bound


def _create_user(session: Session) -> User:
    now = datetime.now(timezone.utc)
    user = User(
        id=str(uuid4()),
        name="Snapshot User",
        email=f"snapshot-{uuid4()}@example.com",
        created_at=now,
        updated_at=now,
    )
    session.add(user)
    session.commit()
    return user


def _create_theme(session: Session, theme_date: date) -> Theme:
    theme = Theme(
        id=str(uuid4()),
        text="Evening waves whisper in the harbor light",
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


def test_finalize_rankings_persists_snapshot(
    db_session: Session,
    redis_client: Redis,
) -> None:
    settings = get_settings()
    target = date(2025, 1, 20)

    user = _create_user(db_session)
    theme = _create_theme(db_session, target)
    work_a = _create_work(db_session, user, theme, "Lantern lights trace the harbor hush")
    work_b = _create_work(db_session, user, theme, "Moonlit sails cradle gentle echoes")

    redis_client.zadd(
        f"{settings.redis_ranking_prefix}{theme.id}",
        {work_a.id: 12, work_b.id: 6},
    )
    redis_client.hset(
        f"metrics:{work_a.id}",
        mapping={"likes": 12, "impressions": 30, "unique_viewers": 25},
    )
    redis_client.hset(
        f"metrics:{work_b.id}",
        mapping={"likes": 6, "impressions": 12, "unique_viewers": 10},
    )

    result = finalize_rankings_for_date(db_session, redis_client, target_date=target, limit=10)

    assert theme.id in result
    stored = db_session.query(Ranking).filter_by(theme_id=theme.id).order_by(Ranking.rank).all()
    assert len(stored) == 2

    def _quantize(value: float) -> float:
        return float(Decimal(value).quantize(Decimal("0.00001"), rounding=ROUND_HALF_UP))

    expected_scores = {
        work_a.id: _quantize(wilson_lower_bound(12, 30)),
        work_b.id: _quantize(wilson_lower_bound(6, 12)),
    }
    ordered_ids = [entry.work_id for entry in stored]
    assert ordered_ids == sorted(expected_scores, key=expected_scores.get, reverse=True)
    for row in stored:
        assert float(row.score) == pytest.approx(expected_scores[row.work_id], rel=1e-5)


def test_finalize_rankings_clears_previous_entries_when_no_candidates(
    db_session: Session,
    redis_client: Redis,
) -> None:
    target = date(2025, 1, 21)
    theme = _create_theme(db_session, target)

    ranking_entry = Ranking(
        theme_id=theme.id,
        work_id=str(uuid4()),
        score=Decimal("0.50000"),
        rank=1,
        snapshot_time=datetime.now(timezone.utc),
    )
    db_session.add(ranking_entry)
    db_session.commit()

    summary = finalize_rankings_for_date(db_session, redis_client, target_date=target)
    assert summary[theme.id] == []

    remaining = db_session.query(Ranking).filter_by(theme_id=theme.id).count()
    assert remaining == 0


def test_finalize_rankings_skips_missing_work(
    db_session: Session,
    redis_client: Redis,
) -> None:
    settings = get_settings()
    target = date(2025, 1, 22)
    theme = _create_theme(db_session, target)

    redis_client.zadd(f"{settings.redis_ranking_prefix}{theme.id}", {"missing-work": 4})
    redis_client.hset("metrics:missing-work", mapping={"likes": 4, "impressions": 8})

    summary = finalize_rankings_for_date(db_session, redis_client, target_date=target)
    assert summary[theme.id] == []
    assert db_session.query(Ranking).filter_by(theme_id=theme.id).count() == 0
