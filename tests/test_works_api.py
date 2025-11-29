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


_REAL_DATETIME = works_service.datetime


def _freeze_datetime(monkeypatch: pytest.MonkeyPatch, target: datetime) -> None:
    """Override works_service.datetime.now to return a fixed aware timestamp."""

    class _FixedDateTime(_REAL_DATETIME):  # type: ignore[misc, valid-type]
        _value = target

        @classmethod
        def now(cls, tz=None):  # type: ignore[override]
            if cls._value.tzinfo is None:
                base = cls._value
                if tz is None:
                    return base
                return base.replace(tzinfo=tz)
            if tz is None:
                return cls._value.replace(tzinfo=None)
            return cls._value.astimezone(tz)

    monkeypatch.setattr(works_service, "datetime", _FixedDateTime)


def _create_user(session: Session) -> User:
    now = datetime.now(timezone.utc)
    user = User(
        id=str(uuid4()),
        name="Test User",
        email=f"tester-{uuid4()}@example.com",
        notify_theme_release=True,
        notify_ranking_result=True,
        created_at=now,
        updated_at=now,
    )
    session.add(user)
    session.commit()
    return user


def _create_theme(session: Session, theme_date: date, *, category: str = "日常") -> Theme:
    theme = Theme(
        id=str(uuid4()),
        text="Spring breeze carries gentle echoes",
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


def test_submit_work_success(
    client: TestClient,
    db_session: Session,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    user = _create_user(db_session)
    theme = _create_theme(db_session, theme_date=date(2025, 1, 15))

    settings = get_settings()
    _freeze_datetime(monkeypatch, datetime(2025, 1, 15, 12, 0, tzinfo=settings.timezone))
    monkeypatch.setattr(works_service, "_current_theme_for_submission", lambda session: theme)

    poem = "twilight hush colors the quiet sky"
    response = client.post(
        "/api/v1/works",
        json={"theme_id": theme.id, "text": poem},
        headers=_auth_headers(user.id),
    )

    assert response.status_code == 201
    payload = response.json()
    assert payload["user_id"] == user.id
    assert payload["theme_id"] == theme.id
    assert payload["text"] == poem
    assert payload["likes_count"] == 0

    stored_work = db_session.query(Work).one()
    assert stored_work.text == poem


def test_submit_work_conflict(
    client: TestClient,
    db_session: Session,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    user = _create_user(db_session)
    theme = _create_theme(db_session, theme_date=date(2025, 1, 16))
    settings = get_settings()
    _freeze_datetime(monkeypatch, datetime(2025, 1, 16, 12, 0, tzinfo=settings.timezone))
    monkeypatch.setattr(works_service, "_current_theme_for_submission", lambda session: theme)

    headers = _auth_headers(user.id)
    poem = "moon echoes cradle gentle wishes"
    first = client.post(
        "/api/v1/works",
        json={"theme_id": theme.id, "text": poem},
        headers=headers,
    )
    assert first.status_code == 201

    second = client.post(
        "/api/v1/works",
        json={"theme_id": theme.id, "text": poem},
        headers=headers,
    )
    assert second.status_code == 409
    assert second.json()["error"]["detail"] == "このカテゴリには本日すでに投稿済みです"


def test_submit_work_conflict_same_day_same_category(
    client: TestClient,
    db_session: Session,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    user = _create_user(db_session)
    shared_date = date(2025, 1, 17)
    primary_theme = _create_theme(db_session, theme_date=shared_date)
    secondary_theme = _create_theme(db_session, theme_date=shared_date, category="日常")

    headers = _auth_headers(user.id)
    settings = get_settings()
    _freeze_datetime(monkeypatch, datetime(shared_date.year, shared_date.month, shared_date.day, 12, 0, tzinfo=settings.timezone))

    monkeypatch.setattr(works_service, "_current_theme_for_submission", lambda session: primary_theme)
    first = client.post(
        "/api/v1/works",
        json={"theme_id": primary_theme.id, "text": "gentle rain sketches the city lights"},
        headers=headers,
    )
    assert first.status_code == 201

    monkeypatch.setattr(works_service, "_current_theme_for_submission", lambda session: secondary_theme)
    second = client.post(
        "/api/v1/works",
        json={"theme_id": secondary_theme.id, "text": "echoes weave softly along the bay"},
        headers=headers,
    )
    assert second.status_code == 409
    assert second.json()["error"]["detail"] == "このカテゴリには本日すでに投稿済みです"


def test_submit_work_allowed_same_day_different_category(
    client: TestClient,
    db_session: Session,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    user = _create_user(db_session)
    shared_date = date(2025, 1, 17)
    nature_theme = _create_theme(db_session, theme_date=shared_date, category="恋愛")
    travel_theme = _create_theme(db_session, theme_date=shared_date, category="季節")

    headers = _auth_headers(user.id)
    settings = get_settings()
    _freeze_datetime(monkeypatch, datetime(shared_date.year, shared_date.month, shared_date.day, 12, 0, tzinfo=settings.timezone))

    monkeypatch.setattr(works_service, "_current_theme_for_submission", lambda session: nature_theme)
    first = client.post(
        "/api/v1/works",
        json={"theme_id": nature_theme.id, "text": "green hills echo the hush of clouds"},
        headers=headers,
    )
    assert first.status_code == 201

    monkeypatch.setattr(works_service, "_current_theme_for_submission", lambda session: travel_theme)
    second = client.post(
        "/api/v1/works",
        json={"theme_id": travel_theme.id, "text": "harbor lights beckon a drifting breeze"},
        headers=headers,
    )
    assert second.status_code == 201


def test_submit_work_rejected_outside_submission_window(
    client: TestClient,
    db_session: Session,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    settings = get_settings()
    closed_time = datetime(2025, 1, 15, 23, 30, tzinfo=settings.timezone)
    _freeze_datetime(monkeypatch, closed_time)

    user = _create_user(db_session)
    theme = _create_theme(db_session, theme_date=closed_time.date())

    response = client.post(
        "/api/v1/works",
        json={"theme_id": theme.id, "text": "quiet harbor sleeps beneath the stars"},
        headers=_auth_headers(user.id),
    )

    assert response.status_code == 403
    assert response.json()["error"]["detail"] == "投稿は6:00〜22:00の間のみ可能です"


def test_submit_work_allowed_next_day_same_category(
    client: TestClient,
    db_session: Session,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    user = _create_user(db_session)
    first_theme = _create_theme(db_session, theme_date=date(2025, 1, 18), category="general")
    second_theme = _create_theme(db_session, theme_date=date(2025, 1, 19), category="general")

    headers = _auth_headers(user.id)
    settings = get_settings()

    monkeypatch.setattr(works_service, "_current_theme_for_submission", lambda session: first_theme)
    _freeze_datetime(monkeypatch, datetime(2025, 1, 18, 12, 0, tzinfo=settings.timezone))
    first = client.post(
        "/api/v1/works",
        json={"theme_id": first_theme.id, "text": "evening hush cradles the harbor glow"},
        headers=headers,
    )
    assert first.status_code == 201

    _freeze_datetime(monkeypatch, datetime(2025, 1, 19, 12, 0, tzinfo=settings.timezone))
    monkeypatch.setattr(works_service, "_current_theme_for_submission", lambda session: second_theme)
    second = client.post(
        "/api/v1/works",
        json={"theme_id": second_theme.id, "text": "dawn returns painting whispers of silver"},
        headers=headers,
    )
    assert second.status_code == 201


def test_submit_work_too_long(
    client: TestClient,
    db_session: Session,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    user = _create_user(db_session)
    theme = _create_theme(db_session, theme_date=date(2025, 1, 17))
    monkeypatch.setattr(works_service, "_current_theme_for_submission", lambda session: theme)

    long_poem = "this line intentionally exceeds forty characters to fail"
    response = client.post(
        "/api/v1/works",
        json={"theme_id": theme.id, "text": long_poem},
        headers=_auth_headers(user.id),
    )

    assert response.status_code == 422
    error = response.json()["error"]
    assert "下の句は40文字以内で入力してください" in error["detail"]


def test_list_works_returns_likes_count(
    client: TestClient,
    db_session: Session,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    user = _create_user(db_session)
    theme = _create_theme(db_session, theme_date=date(2025, 1, 18))
    settings = get_settings()
    _freeze_datetime(monkeypatch, datetime(2025, 1, 18, 12, 0, tzinfo=settings.timezone))
    monkeypatch.setattr(works_service, "_current_theme_for_submission", lambda session: theme)

    headers = _auth_headers(user.id)
    client.post(
        "/api/v1/works",
        json={"theme_id": theme.id, "text": "morning dew threads a silver shimmer"},
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
    theme = _create_theme(db_session, theme_date=date(2025, 1, 19))

    settings = get_settings()
    _freeze_datetime(monkeypatch, datetime(2025, 1, 19, 12, 0, tzinfo=settings.timezone))
    monkeypatch.setattr(works_service, "_current_theme_for_submission", lambda session: theme)
    creation = client.post(
        "/api/v1/works",
        json={"theme_id": theme.id, "text": "lantern light traces whispered stories"},
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
    assert redis_client.hget(f"metrics:{work_id}", "impressions") == "0"


def test_toggle_like_add_remove_readd(
    client: TestClient,
    db_session: Session,
    redis_client,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Test like toggle: add -> remove -> re-add."""
    user = _create_user(db_session)
    theme = _create_theme(db_session, theme_date=date(2025, 1, 20))
    settings = get_settings()
    _freeze_datetime(monkeypatch, datetime(2025, 1, 20, 12, 0, tzinfo=settings.timezone))
    monkeypatch.setattr(works_service, "_current_theme_for_submission", lambda session: theme)

    creation = client.post(
        "/api/v1/works",
        json={"theme_id": theme.id, "text": "starlit tide hums a drifting prayer"},
        headers=_auth_headers(user.id),
    )
    work_id = creation.json()["id"]

    # First toggle: add like
    first = client.post(
        f"/api/v1/works/{work_id}/like",
        headers=_auth_headers(user.id),
    )
    assert first.status_code == 200
    assert first.json()["status"] == "liked"
    assert first.json()["likes_count"] == 1
    assert db_session.query(Like).count() == 1

    # Second toggle: remove like
    second = client.post(
        f"/api/v1/works/{work_id}/like",
        headers=_auth_headers(user.id),
    )
    assert second.status_code == 200
    assert second.json()["status"] == "unliked"
    assert second.json()["likes_count"] == 0
    assert db_session.query(Like).count() == 0

    # Third toggle: re-add like
    third = client.post(
        f"/api/v1/works/{work_id}/like",
        headers=_auth_headers(user.id),
    )
    assert third.status_code == 200
    assert third.json()["status"] == "liked"
    assert third.json()["likes_count"] == 1
    assert db_session.query(Like).count() == 1

    # Verify Redis state after final add
    ranking_key = f"{settings.redis_ranking_prefix}{theme.id}"
    assert redis_client.zscore(ranking_key, work_id) == 1.0
    assert redis_client.hget(f"metrics:{work_id}", "likes") == "1"


def test_get_like_status(
    client: TestClient,
    db_session: Session,
    redis_client,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Test getting like status for a single work."""
    user = _create_user(db_session)
    theme = _create_theme(db_session, theme_date=date(2025, 1, 20))
    settings = get_settings()
    _freeze_datetime(monkeypatch, datetime(2025, 1, 20, 12, 0, tzinfo=settings.timezone))
    monkeypatch.setattr(works_service, "_current_theme_for_submission", lambda session: theme)

    creation = client.post(
        "/api/v1/works",
        json={"theme_id": theme.id, "text": "gentle waves whisper beneath the moon"},
        headers=_auth_headers(user.id),
    )
    work_id = creation.json()["id"]

    # Check status before liking
    status_before = client.get(
        f"/api/v1/works/{work_id}/like/status",
        headers=_auth_headers(user.id),
    )
    assert status_before.status_code == 200
    assert status_before.json()["liked"] is False
    assert status_before.json()["likes_count"] == 0

    # Like the work
    client.post(
        f"/api/v1/works/{work_id}/like",
        headers=_auth_headers(user.id),
    )

    # Check status after liking
    status_after = client.get(
        f"/api/v1/works/{work_id}/like/status",
        headers=_auth_headers(user.id),
    )
    assert status_after.status_code == 200
    assert status_after.json()["liked"] is True
    assert status_after.json()["likes_count"] == 1


def test_get_like_status_batch(
    client: TestClient,
    db_session: Session,
    redis_client,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Test getting like status for multiple works at once."""
    user = _create_user(db_session)
    theme = _create_theme(db_session, theme_date=date(2025, 1, 20))
    settings = get_settings()
    _freeze_datetime(monkeypatch, datetime(2025, 1, 20, 12, 0, tzinfo=settings.timezone))
    monkeypatch.setattr(works_service, "_current_theme_for_submission", lambda session: theme)

    # Create multiple works
    work_ids = []
    for i in range(3):
        # Need different users for different works
        author = _create_user(db_session)
        monkeypatch.setattr(works_service, "_current_theme_for_submission", lambda session: theme)
        creation = client.post(
            "/api/v1/works",
            json={"theme_id": theme.id, "text": f"poem number {i} under starlight"},
            headers=_auth_headers(author.id),
        )
        work_ids.append(creation.json()["id"])

    # Like only the first work
    client.post(
        f"/api/v1/works/{work_ids[0]}/like",
        headers=_auth_headers(user.id),
    )

    # Batch status check
    batch_response = client.post(
        "/api/v1/works/like/status/batch",
        json={"work_ids": work_ids},
        headers=_auth_headers(user.id),
    )
    assert batch_response.status_code == 200
    items = batch_response.json()["items"]
    assert len(items) == 3

    # Verify results
    items_by_id = {item["work_id"]: item for item in items}
    assert items_by_id[work_ids[0]]["liked"] is True
    assert items_by_id[work_ids[0]]["likes_count"] == 1
    assert items_by_id[work_ids[1]]["liked"] is False
    assert items_by_id[work_ids[1]]["likes_count"] == 0
    assert items_by_id[work_ids[2]]["liked"] is False
    assert items_by_id[work_ids[2]]["likes_count"] == 0


def test_record_work_impression_updates_metrics(
    client: TestClient,
    db_session: Session,
    redis_client,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    author = _create_user(db_session)
    theme = _create_theme(db_session, theme_date=date(2025, 1, 21))
    settings = get_settings()
    _freeze_datetime(monkeypatch, datetime(2025, 1, 21, 12, 0, tzinfo=settings.timezone))
    monkeypatch.setattr(works_service, "_current_theme_for_submission", lambda session: theme)

    creation = client.post(
        "/api/v1/works",
        json={"theme_id": theme.id, "text": "misty dawn hums across the river"},
        headers=_auth_headers(author.id),
    )
    work_id = creation.json()["id"]

    viewer_hash = "a" * 64
    response = client.post(
        f"/api/v1/works/{work_id}/impression",
        json={"viewer_hash": viewer_hash, "count": 3},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "recorded"
    assert payload["impressions_count"] == 3
    assert payload["unique_viewers_count"] == 1

    # Clear rate limit key to allow repeat impression
    rate_limit_key = f"impression_rate:{work_id}:{viewer_hash}"
    redis_client.delete(rate_limit_key)

    repeat = client.post(
        f"/api/v1/works/{work_id}/impression",
        json={"viewer_hash": viewer_hash, "count": 2},
    )
    assert repeat.status_code == 200
    repeat_payload = repeat.json()
    assert repeat_payload["impressions_count"] == 5
    assert repeat_payload["unique_viewers_count"] == 1

    second_viewer = client.post(
        f"/api/v1/works/{work_id}/impression",
        json={"viewer_hash": "b" * 64},
    )
    assert second_viewer.status_code == 200
    second_payload = second_viewer.json()
    assert second_payload["impressions_count"] == 6
    assert second_payload["unique_viewers_count"] == 2

    metrics_key = f"metrics:{work_id}"
    assert redis_client.hget(metrics_key, "impressions") == "6"
    assert redis_client.hget(metrics_key, "likes") == "0"
    assert redis_client.hget(metrics_key, "unique_viewers") == "2"

    today_bucket = works_service.datetime.now(get_settings().timezone).strftime("%Y%m%d")
    assert redis_client.exists(f"impressions:{work_id}:{today_bucket}") == 1


def test_record_work_impression_rate_limit(
    client: TestClient,
    db_session: Session,
    redis_client,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Test that rapid successive impressions from same viewer are rate limited."""
    author = _create_user(db_session)
    theme = _create_theme(db_session, theme_date=date(2025, 1, 22))
    settings = get_settings()
    _freeze_datetime(monkeypatch, datetime(2025, 1, 22, 12, 0, tzinfo=settings.timezone))
    monkeypatch.setattr(works_service, "_current_theme_for_submission", lambda session: theme)

    creation = client.post(
        "/api/v1/works",
        json={"theme_id": theme.id, "text": "silent waves echo the distant shore"},
        headers=_auth_headers(author.id),
    )
    work_id = creation.json()["id"]

    viewer_hash = "c" * 64

    # First impression should succeed
    first = client.post(
        f"/api/v1/works/{work_id}/impression",
        json={"viewer_hash": viewer_hash, "count": 1},
    )
    assert first.status_code == 200

    # Immediate second impression should be rate limited
    second = client.post(
        f"/api/v1/works/{work_id}/impression",
        json={"viewer_hash": viewer_hash, "count": 1},
    )
    assert second.status_code == 429
    assert "しばらく時間をおいてからご覧ください" in second.json()["error"]["detail"]


def test_record_work_impression_missing_work(client: TestClient) -> None:
    response = client.post(
        "/api/v1/works/nonexistent/impression",
        json={},
    )
    assert response.status_code == 404
    assert response.json()["error"]["detail"] == "作品が見つかりませんでした"
