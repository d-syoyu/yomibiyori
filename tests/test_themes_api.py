"""Tests for themes API endpoints."""

from __future__ import annotations

from datetime import date, datetime, timezone
from uuid import uuid4

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import Theme


def test_get_today_theme_success(client: TestClient, db_session: Session) -> None:
    """Test successfully retrieving today's theme."""
    today = date.today()
    theme = Theme(
        id=str(uuid4()),
        text="春の風 桜舞い散る",
        category="季節",
        date=today,
        sponsored=False,
        created_at=datetime.now(timezone.utc),
    )
    db_session.add(theme)
    db_session.commit()

    response = client.get("/api/v1/themes/today")
    assert response.status_code == 200

    data = response.json()
    assert data["id"] == theme.id
    assert data["text"] == "春の風 桜舞い散る"
    assert data["category"] == "季節"
    assert data["sponsored"] is False


def test_get_today_theme_not_found(client: TestClient) -> None:
    """Test theme not found for today."""
    response = client.get("/api/v1/themes/today")
    assert response.status_code == 404
    assert response.json()["error"]["detail"] == "本日のお題がまだ届いていません"


def test_get_today_theme_returns_most_recent(client: TestClient, db_session: Session) -> None:
    """Test that when multiple themes exist for today, the most recent is returned."""
    today = date.today()

    # Create two themes for today
    older_theme = Theme(
        id=str(uuid4()),
        text="古いお題",
        category="日常",
        date=today,
        sponsored=False,
        created_at=datetime(2025, 1, 1, 8, 0, 0, tzinfo=timezone.utc),
    )
    newer_theme = Theme(
        id=str(uuid4()),
        text="新しいお題",
        category="恋愛",
        date=today,
        sponsored=True,
        created_at=datetime(2025, 1, 1, 10, 0, 0, tzinfo=timezone.utc),
    )

    db_session.add(older_theme)
    db_session.add(newer_theme)
    db_session.commit()

    response = client.get("/api/v1/themes/today")
    assert response.status_code == 200

    data = response.json()
    assert data["id"] == newer_theme.id
    assert data["text"] == "新しいお題"
    assert data["category"] == "恋愛"
    assert data["sponsored"] is True


def test_get_today_theme_with_category_filter(client: TestClient, db_session: Session) -> None:
    """Test retrieving today's theme with category filter."""
    today = date.today()

    # Create themes for different categories
    love_theme = Theme(
        id=str(uuid4()),
        text="恋の句",
        category="恋愛",
        date=today,
        sponsored=False,
        created_at=datetime(2025, 1, 1, 9, 0, 0, tzinfo=timezone.utc),
    )
    season_theme = Theme(
        id=str(uuid4()),
        text="季節の句",
        category="季節",
        date=today,
        sponsored=False,
        created_at=datetime(2025, 1, 1, 10, 0, 0, tzinfo=timezone.utc),
    )

    db_session.add(love_theme)
    db_session.add(season_theme)
    db_session.commit()

    # Request specific category
    response = client.get("/api/v1/themes/today?category=恋愛")
    assert response.status_code == 200

    data = response.json()
    assert data["id"] == love_theme.id
    assert data["text"] == "恋の句"
    assert data["category"] == "恋愛"


def test_get_today_theme_category_not_found(client: TestClient, db_session: Session) -> None:
    """Test theme not found for specified category."""
    today = date.today()

    # Create theme only for '季節' category
    theme = Theme(
        id=str(uuid4()),
        text="季節の句",
        category="季節",
        date=today,
        sponsored=False,
        created_at=datetime.now(timezone.utc),
    )
    db_session.add(theme)
    db_session.commit()

    # Request different category
    response = client.get("/api/v1/themes/today?category=恋愛")
    assert response.status_code == 404
    assert "本日の「恋愛」カテゴリのお題がまだ届いていません" in response.json()["error"]["detail"]
