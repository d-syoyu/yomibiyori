"""Theme generation service utilities."""

from __future__ import annotations

import time
from dataclasses import dataclass
from datetime import date, datetime, timezone
from typing import Sequence
from uuid import uuid4

from sqlalchemy import Select, select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models import Theme
from app.services.theme_ai_client import ThemeAIClient, ThemeAIClientError, resolve_theme_ai_client


class ThemeGenerationError(RuntimeError):
    """Raised when automatic theme generation fails after retries."""


def _validate_theme_text(text: str) -> str:
    """Return a trimmed theme text if it satisfies length constraints."""

    stripped = text.strip()
    if not stripped:
        raise ValueError("Theme text cannot be empty")
    length = len(stripped)
    if length < 3:
        raise ValueError("Theme text must be at least 3 characters long")
    if length > 140:
        raise ValueError("Theme text must be 140 characters or fewer")
    return stripped


def _generate_with_retry(
    ai_client: ThemeAIClient,
    *,
    category: str,
    target_date: date,
) -> str:
    """Generate a theme text using the configured retry strategy."""

    settings = get_settings()
    max_attempts = settings.theme_generation_max_retries
    delay_seconds = settings.theme_generation_retry_delay_seconds
    last_error: Exception | None = None

    for attempt in range(1, max_attempts + 1):
        try:
            raw_text = ai_client.generate(category=category, target_date=target_date)
            return _validate_theme_text(raw_text)
        except (ThemeAIClientError, ValueError) as exc:
            last_error = exc
            if attempt >= max_attempts:
                break
            if delay_seconds > 0:
                time.sleep(delay_seconds)

    error = ThemeGenerationError(f"Failed to generate theme for category '{category}' after {max_attempts} attempts")
    if last_error:
        raise error from last_error
    raise error


def upsert_theme(
    session: Session,
    *,
    category: str,
    target_date: date,
    text: str,
) -> Theme:
    """Insert or update a theme for the supplied category and date."""

    stripped = _validate_theme_text(text)
    stmt: Select[Theme] = (
        select(Theme)
        .where(Theme.category == category, Theme.date == target_date)
        .limit(1)
    )
    existing = session.execute(stmt).scalars().first()

    if existing:
        existing.text = stripped
        session.add(existing)
        return existing

    now_utc = datetime.now(timezone.utc)
    theme = Theme(
        id=str(uuid4()),
        text=stripped,
        category=category,
        date=target_date,
        sponsored=False,
        created_at=now_utc,
    )
    session.add(theme)
    return theme


@dataclass(slots=True)
class ThemeGenerationResult:
    """Result of generating a theme for a single category."""

    category: str
    theme: Theme
    generated_text: str
    was_created: bool


def generate_all_categories(
    session: Session,
    ai_client: ThemeAIClient | None = None,
    *,
    target_date: date | None = None,
    commit: bool = True,
) -> list[ThemeGenerationResult]:
    """Generate themes for all configured categories and persist them."""

    settings = get_settings()
    tz = settings.timezone
    resolved_date = target_date or datetime.now(tz).date()

    client = ai_client or resolve_theme_ai_client()
    results: list[ThemeGenerationResult] = []
    themes_before = {
        (theme.category, theme.date): theme.id
        for theme in session.execute(
            select(Theme).where(Theme.date == resolved_date)
        ).scalars()
    }

    for category in settings.theme_categories_list:
        text = _generate_with_retry(client, category=category, target_date=resolved_date)
        existing_id = themes_before.get((category, resolved_date))
        theme = upsert_theme(session, category=category, target_date=resolved_date, text=text)
        was_created = existing_id is None
        results.append(
            ThemeGenerationResult(
                category=category,
                theme=theme,
                generated_text=text,
                was_created=was_created,
            )
        )

    if commit:
        session.commit()
    else:
        session.flush()

    return results
