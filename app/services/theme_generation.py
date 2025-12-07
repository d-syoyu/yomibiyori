"""Theme generation service utilities."""

from __future__ import annotations

import time
from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from typing import Sequence
from uuid import uuid4

from sqlalchemy import Select, desc, select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.logging import logger
from app.models import Theme
from app.services.theme_ai_client import ThemeAIClient, ThemeAIClientError, resolve_theme_ai_client


# 過去のお題を何日分取得するか
PAST_THEMES_DAYS = 60


class ThemeGenerationError(RuntimeError):
    """Raised when automatic theme generation fails after retries."""


def get_past_themes(
    session: Session,
    *,
    category: str,
    target_date: date,
    days: int = PAST_THEMES_DAYS,
) -> list[str]:
    """指定カテゴリーの過去お題テキストを取得する。

    Args:
        session: SQLAlchemy session
        category: カテゴリー名
        target_date: 対象日付（この日付より前のお題を取得）
        days: 過去何日分を取得するか

    Returns:
        過去のお題テキストのリスト（新しい順）
    """
    start_date = target_date - timedelta(days=days)
    stmt = (
        select(Theme.text)
        .where(
            Theme.category == category,
            Theme.date >= start_date,
            Theme.date < target_date,
        )
        .order_by(desc(Theme.date))
    )
    result = session.execute(stmt).scalars().all()
    return list(result)


def _is_duplicate_theme(new_text: str, past_themes: list[str]) -> bool:
    """生成されたお題が過去のものと重複しているかチェック。

    完全一致だけでなく、改行を除去した状態での比較も行う。
    """
    # 改行を除去して正規化
    normalized_new = new_text.replace('\n', '').strip()

    for past in past_themes:
        normalized_past = past.replace('\n', '').strip()
        if normalized_new == normalized_past:
            return True

    return False


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
    past_themes: list[str] | None = None,
) -> str:
    """Generate a theme text using the configured retry strategy.

    Args:
        ai_client: AIクライアント
        category: カテゴリー名
        target_date: 対象日付
        past_themes: 過去のお題リスト（重複防止用）
    """
    settings = get_settings()
    max_attempts = settings.theme_generation_max_retries
    delay_seconds = settings.theme_generation_retry_delay_seconds
    last_error: Exception | None = None
    past_list = past_themes or []

    for attempt in range(1, max_attempts + 1):
        try:
            raw_text = ai_client.generate(
                category=category,
                target_date=target_date,
                past_themes=past_list,
            )
            validated_text = _validate_theme_text(raw_text)

            # 重複チェック
            if _is_duplicate_theme(validated_text, past_list):
                logger.warning(
                    f"Generated theme is duplicate (attempt {attempt}/{max_attempts}): "
                    f"'{validated_text[:30]}...'"
                )
                if attempt >= max_attempts:
                    # リトライ上限に達した場合でも重複なら失敗扱い
                    raise ThemeGenerationError(
                        f"All generated themes for '{category}' were duplicates"
                    )
                if delay_seconds > 0:
                    time.sleep(delay_seconds)
                continue

            return validated_text
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
) -> Theme | None:
    """Insert or update a theme for the supplied category and date.

    Returns None if a sponsor theme already exists for this slot.
    """

    stripped = _validate_theme_text(text)
    stmt: Select[Theme] = (
        select(Theme)
        .where(Theme.category == category, Theme.date == target_date)
        .limit(1)
    )
    existing = session.execute(stmt).scalars().first()

    if existing:
        if existing.sponsored:
            # Don't overwrite sponsor themes with AI themes
            logger.info(
                f"Skipping AI theme generation for {category} on {target_date}: "
                f"sponsor theme already exists"
            )
            return None

        # Update existing AI theme
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
        # Check if sponsor theme already exists
        existing = session.execute(
            select(Theme).where(
                Theme.category == category,
                Theme.date == resolved_date
            )
        ).scalars().first()

        if existing and existing.sponsored:
            logger.info(
                f"Skipping {category} on {resolved_date}: sponsor theme exists"
            )
            continue

        # 過去のお題を取得（重複防止用）
        past_themes = get_past_themes(
            session,
            category=category,
            target_date=resolved_date,
        )
        logger.info(
            f"Loaded {len(past_themes)} past themes for category '{category}' "
            f"(last {PAST_THEMES_DAYS} days)"
        )

        # Generate AI theme
        text = _generate_with_retry(
            client,
            category=category,
            target_date=resolved_date,
            past_themes=past_themes,
        )
        existing_id = themes_before.get((category, resolved_date))
        theme = upsert_theme(session, category=category, target_date=resolved_date, text=text)

        # upsert_theme returns None if sponsor theme exists
        if theme is None:
            continue

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
