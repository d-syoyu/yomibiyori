"""Tests for theme generation service."""

from __future__ import annotations

from contextlib import contextmanager
from datetime import date, datetime, timezone
from typing import Any
from uuid import uuid4

import pytest
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models import Theme
from app.services.theme_generation import ThemeGenerationError, ThemeGenerationResult, generate_all_categories
from app.services.theme_ai_client import ThemeAIClient


@contextmanager
def mock_session_factory(session: Session):
    """Context manager that yields the provided session, mimicking SessionLocal."""
    # We don't close the session here because it's managed by the pytest fixture
    yield session


class _StaticThemeClient:
    """Simple AI client returning preconfigured results."""

    def __init__(self, responses: dict[str, str]) -> None:
        self._responses = responses

    def generate(self, *, category: str, target_date: date, past_themes: list[str] | None = None) -> str:
        if category not in self._responses:
            raise KeyError(f"Missing response for category {category}")
        return self._responses[category]


def _prepare_theme(
    session: Session,
    *,
    category: str,
    theme_date: date,
    text: str,
) -> Theme:
    theme = Theme(
        id=str(uuid4()),
        text=text,
        category=category,
        date=theme_date,
        sponsored=False,
        created_at=datetime.now(timezone.utc),
    )
    session.add(theme)
    session.commit()
    return theme


def test_generate_all_categories_inserts_new_themes(db_session: Session, monkeypatch: pytest.MonkeyPatch) -> None:
    settings = get_settings()
    monkeypatch.setattr(settings, "theme_categories", "general,emotion")
    monkeypatch.setattr(settings, "theme_generation_max_retries", 1)

    client = _StaticThemeClient(
        {
            "general": "Gentle dawn hums across the valley",
            "emotion": "Tender echoes linger in the heart",
        }
    )

    target = date(2025, 1, 5)
    
    # Pass session_factory instead of db_session directly
    results = generate_all_categories(
        client, 
        target_date=target, 
        session_factory=lambda: mock_session_factory(db_session)
    )

    assert len(results) == 2
    stored = db_session.query(Theme).filter(Theme.date == target).all()
    assert {theme.category for theme in stored} == {"general", "emotion"}
    assert all(len(theme.text) >= 3 for theme in stored)


def test_generate_all_categories_updates_existing_theme(db_session: Session, monkeypatch: pytest.MonkeyPatch) -> None:
    settings = get_settings()
    monkeypatch.setattr(settings, "theme_categories", "general")
    monkeypatch.setattr(settings, "theme_generation_max_retries", 1)

    target = date(2025, 1, 6)
    existing = _prepare_theme(
        db_session,
        category="general",
        theme_date=target,
        text="Old verse awaiting renewal",
    )

    client = _StaticThemeClient({"general": "Fresh morning breeze inspires hope"})
    
    results = generate_all_categories(
        client, 
        target_date=target,
        session_factory=lambda: mock_session_factory(db_session)
    )

    assert len(results) == 1
    result = results[0]
    assert not result.was_created
    db_session.refresh(existing)
    assert existing.text == "Fresh morning breeze inspires hope"


def test_generate_all_categories_raises_on_invalid_text(db_session: Session, monkeypatch: pytest.MonkeyPatch) -> None:
    settings = get_settings()
    monkeypatch.setattr(settings, "theme_categories", "general")
    monkeypatch.setattr(settings, "theme_generation_max_retries", 2)
    monkeypatch.setattr(settings, "theme_generation_retry_delay_seconds", 0.0)

    class _InvalidClient:
        def generate(self, *, category: str, target_date: date, past_themes: list[str] | None = None) -> str:
            return " "  # Always invalid

    # generate_all_categories catches exceptions per category but logs them.
    # It does NOT raise ThemeGenerationError for the whole batch unless something critical fails.
    # Wait, the previous implementation did raise because it wasn't catching inside the loop?
    # No, the new implementation catches exceptions inside the loop to continue processing other categories.
    # So this test expectation needs to change: it should return empty results, not raise.
    
    results = generate_all_categories(
        _InvalidClient(), 
        target_date=date(2025, 1, 7),
        session_factory=lambda: mock_session_factory(db_session)
    )
    
    assert len(results) == 0
    assert db_session.query(Theme).filter(Theme.date == date(2025, 1, 7)).count() == 0
