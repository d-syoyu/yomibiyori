"""Tests for theme generation service."""

from __future__ import annotations

from contextlib import contextmanager
from datetime import date, datetime, timezone
from uuid import uuid4

import pytest
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models import Theme
from app.services.theme_generation import generate_all_categories


@contextmanager
def mock_session_factory(session: Session):
    """Context manager that yields the provided session, mimicking SessionLocal."""

    yield session


class _StaticThemeClient:
    """Simple AI client returning preconfigured results."""

    def __init__(self, responses: dict[str, str]) -> None:
        self._responses = responses

    def generate(
        self,
        *,
        category: str,
        target_date: date,
        past_themes: list[str] | None = None,
    ) -> str:
        if category not in self._responses:
            raise KeyError(f"Missing response for category {category}")
        return self._responses[category]


def _prepare_theme(
    session: Session,
    *,
    category: str,
    theme_date: date,
    text: str,
    sponsored: bool = False,
) -> Theme:
    theme = Theme(
        id=str(uuid4()),
        text=text,
        category=category,
        date=theme_date,
        sponsored=sponsored,
        created_at=datetime.now(timezone.utc),
    )
    session.add(theme)
    session.commit()
    return theme


def test_generate_all_categories_inserts_new_themes(
    db_session: Session,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
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
    batch = generate_all_categories(
        client,
        target_date=target,
        session_factory=lambda: mock_session_factory(db_session),
    )

    assert len(batch.results) == 2
    assert batch.skipped_categories == []
    assert batch.failed_categories == []
    assert batch.missing_categories == []

    stored = db_session.query(Theme).filter(Theme.date == target).all()
    assert {theme.category for theme in stored} == {"general", "emotion"}
    assert all(len(theme.text) >= 3 for theme in stored)


def test_generate_all_categories_skips_existing_ai_theme_by_default(
    db_session: Session,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
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
    batch = generate_all_categories(
        client,
        target_date=target,
        session_factory=lambda: mock_session_factory(db_session),
    )

    assert batch.results == []
    assert batch.skipped_categories == ["general"]
    assert batch.failed_categories == []
    assert batch.missing_categories == []

    db_session.refresh(existing)
    assert existing.text == "Old verse awaiting renewal"


def test_generate_all_categories_overwrites_existing_ai_when_requested(
    db_session: Session,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
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
    batch = generate_all_categories(
        client,
        target_date=target,
        session_factory=lambda: mock_session_factory(db_session),
        overwrite_existing_ai=True,
    )

    assert len(batch.results) == 1
    assert batch.results[0].was_created is False
    assert batch.skipped_categories == []
    assert batch.failed_categories == []
    assert batch.missing_categories == []

    db_session.refresh(existing)
    assert existing.text == "Fresh morning breeze inspires hope"


def test_generate_all_categories_reports_missing_categories_on_failure(
    db_session: Session,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    settings = get_settings()
    monkeypatch.setattr(settings, "theme_categories", "general,emotion")
    monkeypatch.setattr(settings, "theme_generation_max_retries", 2)
    monkeypatch.setattr(settings, "theme_generation_retry_delay_seconds", 0.0)

    class _PartiallyInvalidClient:
        def generate(
            self,
            *,
            category: str,
            target_date: date,
            past_themes: list[str] | None = None,
        ) -> str:
            if category == "general":
                return "Gentle dawn hums across the valley"
            return " "

    target = date(2025, 1, 7)
    batch = generate_all_categories(
        _PartiallyInvalidClient(),
        target_date=target,
        session_factory=lambda: mock_session_factory(db_session),
    )

    assert [result.category for result in batch.results] == ["general"]
    assert batch.failed_categories == ["emotion"]
    assert batch.missing_categories == ["emotion"]

    stored = db_session.query(Theme).filter(Theme.date == target).all()
    assert [theme.category for theme in stored] == ["general"]


def test_retry_run_generates_only_missing_categories(
    db_session: Session,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    settings = get_settings()
    monkeypatch.setattr(settings, "theme_categories", "general,emotion")
    monkeypatch.setattr(settings, "theme_generation_max_retries", 1)
    monkeypatch.setattr(settings, "theme_generation_retry_delay_seconds", 0.0)

    target = date(2025, 1, 8)

    class _FirstRunClient:
        def generate(
            self,
            *,
            category: str,
            target_date: date,
            past_themes: list[str] | None = None,
        ) -> str:
            if category == "general":
                return "Gentle dawn hums across the valley"
            raise ValueError("temporary provider failure")

    first_batch = generate_all_categories(
        _FirstRunClient(),
        target_date=target,
        session_factory=lambda: mock_session_factory(db_session),
    )

    assert [result.category for result in first_batch.results] == ["general"]
    assert first_batch.missing_categories == ["emotion"]

    retry_batch = generate_all_categories(
        _StaticThemeClient(
            {
                "general": "This text should not overwrite existing AI",
                "emotion": "Tender echoes linger in the heart",
            }
        ),
        target_date=target,
        session_factory=lambda: mock_session_factory(db_session),
    )

    assert [result.category for result in retry_batch.results] == ["emotion"]
    assert retry_batch.skipped_categories == ["general"]
    assert retry_batch.failed_categories == []
    assert retry_batch.missing_categories == []

    stored = (
        db_session.query(Theme)
        .filter(Theme.date == target)
        .order_by(Theme.category)
        .all()
    )
    assert [(theme.category, theme.text) for theme in stored] == [
        ("emotion", "Tender echoes linger in the heart"),
        ("general", "Gentle dawn hums across the valley"),
    ]
