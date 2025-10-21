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
        created_at=now,
        updated_at=now,
    )
    session.add(user)
    session.commit()
    return user


def _create_theme(session: Session, theme_date: date, *, category: str = "general") -> Theme:
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

    monkeypatch.setattr(works_service, "_current_theme_for_submission", lambda session: theme)

    poem = "twilight hush colors the quiet sky"
    response = client.post(
        "/api/v1/works",
        json={"text": poem},
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
    monkeypatch.setattr(works_service, "_current_theme_for_submission", lambda session: theme)

    headers = _auth_headers(user.id)
    poem = "moon echoes cradle gentle wishes"
    first = client.post(
        "/api/v1/works",
        json={"text": poem},
        headers=headers,
    )
    assert first.status_code == 201

    second = client.post(
        "/api/v1/works",
        json={"text": poem},
        headers=headers,
    )
    assert second.status_code == 409
    assert second.json()["detail"] == "You have already submitted a work today for this category"


def test_submit_work_conflict_same_day_same_category(
    client: TestClient,
    db_session: Session,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    user = _create_user(db_session)
    shared_date = date(2025, 1, 17)
    primary_theme = _create_theme(db_session, theme_date=shared_date)
    secondary_theme = _create_theme(db_session, theme_date=shared_date, category="general")

    headers = _auth_headers(user.id)

    monkeypatch.setattr(works_service, "_current_theme_for_submission", lambda session: primary_theme)
    first = client.post(
        "/api/v1/works",
        json={"text": "gentle rain sketches the city lights"},
        headers=headers,
    )
    assert first.status_code == 201

    monkeypatch.setattr(works_service, "_current_theme_for_submission", lambda session: secondary_theme)
    second = client.post(
        "/api/v1/works",
        json={"text": "echoes weave softly along the bay"},
        headers=headers,
    )
    assert second.status_code == 409
    assert second.json()["detail"] == "You have already submitted a work today for this category"


def test_submit_work_allowed_same_day_different_category(
    client: TestClient,
    db_session: Session,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    user = _create_user(db_session)
    shared_date = date(2025, 1, 17)
    nature_theme = _create_theme(db_session, theme_date=shared_date, category="nature")
    travel_theme = _create_theme(db_session, theme_date=shared_date, category="travel")

    headers = _auth_headers(user.id)

    monkeypatch.setattr(works_service, "_current_theme_for_submission", lambda session: nature_theme)
    first = client.post(
        "/api/v1/works",
        json={"text": "green hills echo the hush of clouds"},
        headers=headers,
    )
    assert first.status_code == 201

    monkeypatch.setattr(works_service, "_current_theme_for_submission", lambda session: travel_theme)
    second = client.post(
        "/api/v1/works",
        json={"text": "harbor lights beckon a drifting breeze"},
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
    _create_theme(db_session, theme_date=closed_time.date())

    response = client.post(
        "/api/v1/works",
        json={"text": "quiet harbor sleeps beneath the stars"},
        headers=_auth_headers(user.id),
    )

    assert response.status_code == 403
    assert response.json()["detail"] == "Submissions are closed between 22:00 and 06:00 JST"


def test_submit_work_allowed_next_day_same_category(
    client: TestClient,
    db_session: Session,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    user = _create_user(db_session)
    first_theme = _create_theme(db_session, theme_date=date(2025, 1, 18), category="general")
    second_theme = _create_theme(db_session, theme_date=date(2025, 1, 19), category="general")

    headers = _auth_headers(user.id)

    monkeypatch.setattr(works_service, "_current_theme_for_submission", lambda session: first_theme)
    first = client.post(
        "/api/v1/works",
        json={"text": "evening hush cradles the harbor glow"},
        headers=headers,
    )
    assert first.status_code == 201

    monkeypatch.setattr(works_service, "_current_theme_for_submission", lambda session: second_theme)
    second = client.post(
        "/api/v1/works",
        json={"text": "dawn returns painting whispers of silver"},
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
        json={"text": long_poem},
        headers=_auth_headers(user.id),
    )

    assert response.status_code == 422
    detail = response.json()["detail"]
    assert isinstance(detail, list)
    assert any("at most 40 characters" in issue.get("msg", "") for issue in detail)


def test_list_works_returns_likes_count(
    client: TestClient,
    db_session: Session,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    user = _create_user(db_session)
    theme = _create_theme(db_session, theme_date=date(2025, 1, 18))
    monkeypatch.setattr(works_service, "_current_theme_for_submission", lambda session: theme)

    headers = _auth_headers(user.id)
    client.post(
        "/api/v1/works",
        json={"text": "morning dew threads a silver shimmer"},
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

    monkeypatch.setattr(works_service, "_current_theme_for_submission", lambda session: theme)
    creation = client.post(
        "/api/v1/works",
        json={"text": "lantern light traces whispered stories"},
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


def test_like_work_conflict(
    client: TestClient,
    db_session: Session,
    redis_client,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    user = _create_user(db_session)
    theme = _create_theme(db_session, theme_date=date(2025, 1, 20))
    monkeypatch.setattr(works_service, "_current_theme_for_submission", lambda session: theme)

    creation = client.post(
        "/api/v1/works",
        json={"text": "starlit tide hums a drifting prayer"},
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


def test_record_work_impression_updates_metrics(
    client: TestClient,
    db_session: Session,
    redis_client,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    author = _create_user(db_session)
    theme = _create_theme(db_session, theme_date=date(2025, 1, 21))
    monkeypatch.setattr(works_service, "_current_theme_for_submission", lambda session: theme)

    creation = client.post(
        "/api/v1/works",
        json={"text": "misty dawn hums across the river"},
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

    today_bucket = datetime.now(get_settings().timezone).strftime("%Y%m%d")
    assert redis_client.exists(f"impressions:{work_id}:{today_bucket}") == 1


def test_record_work_impression_missing_work(client: TestClient) -> None:
    response = client.post(
        "/api/v1/works/nonexistent/impression",
        json={},
    )
    assert response.status_code == 404
    assert response.json()["detail"] == "Work not found"
