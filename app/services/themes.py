"""Domain services for themes."""

from __future__ import annotations

from datetime import datetime

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models import Theme
from app.schemas.theme import ThemeResponse


def get_today_theme(session: Session, category: str | None = None) -> ThemeResponse:
    """Return the theme for today's date in the application timezone.

    Args:
        session: Database session
        category: Optional category filter (e.g., '恋愛', '季節', '日常', 'ユーモア')

    Returns:
        ThemeResponse for today's theme in the specified category

    Raises:
        HTTPException: 404 if no theme found for today (and optional category)

    If multiple themes exist for today (different categories) and no category is specified,
    returns the most recent.
    """
    settings = get_settings()
    now_jst = datetime.now(settings.timezone)
    today_date = now_jst.date()

    stmt = select(Theme).where(Theme.date == today_date)

    if category:
        stmt = stmt.where(Theme.category == category)

    stmt = stmt.order_by(Theme.created_at.desc()).limit(1)

    theme = session.execute(stmt).scalars().first()
    if not theme:
        detail = f"No theme found for today in category '{category}'" if category else "No theme found for today"
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=detail
        )

    return ThemeResponse(
        id=str(theme.id),
        text=theme.text,
        category=theme.category,
        date=theme.date,
        sponsored=theme.sponsored,
        created_at=theme.created_at,
    )
