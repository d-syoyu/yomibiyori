"""Integration test: Verify likes are reflected in rankings."""

from __future__ import annotations

from datetime import date, datetime, timezone
from uuid import uuid4

import fakeredis
import jwt
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models import Theme, User


def _create_user(session: Session, email: str) -> User:
    now = datetime.now(timezone.utc)
    user = User(
        id=str(uuid4()),
        name=f"User {email}",
        email=email,
        created_at=now,
        updated_at=now,
    )
    session.add(user)
    session.commit()
    return user


def _create_theme(session: Session, theme_date: date, *, category: str = "恋愛") -> Theme:
    theme = Theme(
        id=str(uuid4()),
        text="春の風",
        category=category,
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


def test_like_reflects_in_ranking(
    client: TestClient,
    db_session: Session,
    redis_client: fakeredis.FakeRedis,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Test that liking a work updates its ranking position."""

    # Setup: Create users and theme
    author = _create_user(db_session, "author@example.com")
    liker = _create_user(db_session, "liker@example.com")
    theme = _create_theme(db_session, theme_date=date(2025, 1, 20), category="恋愛")

    # Mock datetime for submission window
    from app.services import works as works_service
    settings = get_settings()
    fixed_time = datetime(2025, 1, 20, 12, 0, tzinfo=settings.timezone)

    class _FixedDateTime(datetime):  # type: ignore[misc]
        @classmethod
        def now(cls, tz=None):  # type: ignore[override]
            if tz is None:
                return fixed_time.replace(tzinfo=None)
            return fixed_time.astimezone(tz)

    monkeypatch.setattr(works_service, "datetime", _FixedDateTime)

    # Step 1: Author submits a work
    work_response = client.post(
        "/api/v1/works",
        json={"theme_id": theme.id, "text": "花散る夜\n月明かりに"},
        headers=_auth_headers(author.id),
    )
    assert work_response.status_code == 201
    work_data = work_response.json()
    work_id = work_data["id"]

    # Step 2: Check ranking before like - work should appear with score 0
    ranking_response = client.get(
        f"/api/v1/ranking?theme_id={theme.id}",
    )
    assert ranking_response.status_code == 200
    ranking_before = ranking_response.json()
    assert len(ranking_before) == 1
    assert ranking_before[0]["work_id"] == work_id
    assert ranking_before[0]["rank"] == 1
    score_before = ranking_before[0]["score"]

    # Step 3: Liker likes the work
    like_response = client.post(
        f"/api/v1/works/{work_id}/like",
        headers=_auth_headers(liker.id),
    )
    assert like_response.status_code == 200
    like_data = like_response.json()
    assert like_data["likes_count"] == 1

    # Step 4: Check ranking after like - score should increase
    ranking_response_after = client.get(
        f"/api/v1/ranking?theme_id={theme.id}",
    )
    assert ranking_response_after.status_code == 200
    ranking_after = ranking_response_after.json()
    assert len(ranking_after) == 1
    assert ranking_after[0]["work_id"] == work_id
    score_after = ranking_after[0]["score"]

    # Verify score increased
    print(f"\nScore before like: {score_before}")
    print(f"Score after like: {score_after}")
    print(f"Score increased: {score_after > score_before}")

    assert score_after > score_before, f"Score should increase after like (before: {score_before}, after: {score_after})"


def test_multiple_works_ranking_order(
    client: TestClient,
    db_session: Session,
    redis_client: fakeredis.FakeRedis,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Test that works with more likes rank higher."""

    # Setup: Create users and theme
    author1 = _create_user(db_session, "author1@example.com")
    author2 = _create_user(db_session, "author2@example.com")
    liker1 = _create_user(db_session, "liker1@example.com")
    liker2 = _create_user(db_session, "liker2@example.com")
    theme = _create_theme(db_session, theme_date=date(2025, 1, 20), category="恋愛")

    # Mock datetime
    from app.services import works as works_service
    settings = get_settings()
    fixed_time = datetime(2025, 1, 20, 12, 0, tzinfo=settings.timezone)

    class _FixedDateTime(datetime):  # type: ignore[misc]
        @classmethod
        def now(cls, tz=None):  # type: ignore[override]
            if tz is None:
                return fixed_time.replace(tzinfo=None)
            return fixed_time.astimezone(tz)

    monkeypatch.setattr(works_service, "datetime", _FixedDateTime)

    # Create two works
    work1_response = client.post(
        "/api/v1/works",
        json={"theme_id": theme.id, "text": "花散る夜\n月明かりに"},
        headers=_auth_headers(author1.id),
    )
    assert work1_response.status_code == 201
    work1_id = work1_response.json()["id"]

    work2_response = client.post(
        "/api/v1/works",
        json={"theme_id": theme.id, "text": "桜咲く\n春の訪れ"},
        headers=_auth_headers(author2.id),
    )
    assert work2_response.status_code == 201
    work2_id = work2_response.json()["id"]

    # Give work2 two likes, work1 one like
    client.post(f"/api/v1/works/{work1_id}/like", headers=_auth_headers(liker1.id))
    client.post(f"/api/v1/works/{work2_id}/like", headers=_auth_headers(liker1.id))
    client.post(f"/api/v1/works/{work2_id}/like", headers=_auth_headers(liker2.id))

    # Check ranking - work2 should rank higher
    ranking_response = client.get(f"/api/v1/ranking?theme_id={theme.id}")
    assert ranking_response.status_code == 200
    ranking = ranking_response.json()

    assert len(ranking) == 2
    print(f"\nRanking:")
    for entry in ranking:
        print(f"  Rank {entry['rank']}: work_id={entry['work_id']}, score={entry['score']}")

    # work2 should be rank 1 (more likes)
    assert ranking[0]["work_id"] == work2_id
    assert ranking[0]["rank"] == 1

    # work1 should be rank 2
    assert ranking[1]["work_id"] == work1_id
    assert ranking[1]["rank"] == 2
