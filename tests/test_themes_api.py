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
        category="season",
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
    assert data["category"] == "season"
    assert data["sponsored"] is False


def test_get_today_theme_not_found(client: TestClient) -> None:
    """Test theme not found for today."""
    response = client.get("/api/v1/themes/today")
    assert response.status_code == 404
    assert response.json()["detail"] == "No theme found for today"


def test_get_today_theme_returns_most_recent(client: TestClient, db_session: Session) -> None:
    """Test that when multiple themes exist for today, the most recent is returned."""
    today = date.today()

    # Create two themes for today
    older_theme = Theme(
        id=str(uuid4()),
        text="古いお題",
        category="general",
        date=today,
        sponsored=False,
        created_at=datetime(2025, 1, 1, 8, 0, 0, tzinfo=timezone.utc),
    )
    newer_theme = Theme(
        id=str(uuid4()),
        text="新しいお題",
        category="nature",
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
    assert data["category"] == "nature"
    assert data["sponsored"] is True
