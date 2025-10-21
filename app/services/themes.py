"""Domain services for themes."""

from __future__ import annotations

from datetime import datetime

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models import Theme
from app.schemas.theme import ThemeResponse


def get_today_theme(session: Session) -> ThemeResponse:
    """Return the theme for today's date in the application timezone.

    If multiple themes exist for today (different categories), returns the most recent.
    """
    settings = get_settings()
    now_jst = datetime.now(settings.timezone)
    today_date = now_jst.date()

    stmt = (
        select(Theme)
        .where(Theme.date == today_date)
        .order_by(Theme.created_at.desc())
        .limit(1)
    )

    theme = session.execute(stmt).scalars().first()
    if not theme:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No theme found for today"
        )

    return ThemeResponse(
        id=str(theme.id),
        text=theme.text,
        category=theme.category,
        date=theme.date,
        sponsored=theme.sponsored,
        created_at=theme.created_at,
    )
