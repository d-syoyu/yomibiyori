"""Domain services for themes."""

from __future__ import annotations

from datetime import date, datetime, timedelta

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.core.config import get_settings
from app.models import Theme, SponsorTheme, SponsorCampaign, Sponsor
from app.schemas.theme import ThemeListResponse, ThemeResponse


def _is_theme_finalized(theme_date: date) -> bool:
    """Check if ranking for a theme is finalized (after 22:00 JST on theme date).

    Args:
        theme_date: The date of the theme

    Returns:
        True if ranking is finalized, False otherwise
    """
    settings = get_settings()
    now_jst = datetime.now(settings.timezone)
    current_date = now_jst.date()

    # If theme date is in the past, it's finalized
    if current_date > theme_date:
        return True

    # If theme date is in the future, it's not finalized
    if current_date < theme_date:
        return False

    # Same day: finalized if hour >= 22
    return now_jst.hour >= 22


def _get_sponsor_url(theme: Theme) -> str | None:
    """Get the official URL of the sponsor if available."""
    if not theme.sponsored or not theme.sponsor_theme:
        return None
    
    # Access via relationships: Theme -> SponsorTheme -> SponsorCampaign -> Sponsor
    try:
        if theme.sponsor_theme.campaign and theme.sponsor_theme.campaign.sponsor:
            return theme.sponsor_theme.campaign.sponsor.official_url
    except Exception:
        # Handle cases where relationships might be missing or broken
        return None
        
    return None


def list_themes(
    session: Session,
    category: str | None = None,
    limit: int = 10,
    offset: int = 0,
) -> ThemeListResponse:
    """Return a list of themes, optionally filtered by category.

    Args:
        session: Database session
        category: Optional category filter
        limit: Maximum number of themes to return
        offset: Number of themes to skip

    Returns:
        ThemeListResponse with themes ordered by date descending
    """
    stmt = select(Theme).options(
        joinedload(Theme.sponsor_theme)
        .joinedload(SponsorTheme.campaign)
        .joinedload(SponsorCampaign.sponsor)
    ).order_by(
        Theme.date.desc(),
        Theme.sponsored.desc(),  # Prioritize sponsored themes
        Theme.created_at.desc()
    )

    if category:
        stmt = stmt.where(Theme.category == category)

    stmt = stmt.limit(limit).offset(offset)

    themes = session.execute(stmt).scalars().all()

    theme_responses = [
        ThemeResponse(
            id=str(theme.id),
            text=theme.text,
            category=theme.category,
            date=theme.date,
            sponsored=theme.sponsored,
            sponsor_company_name=theme.sponsor_company_name,
            sponsor_official_url=_get_sponsor_url(theme),
            created_at=theme.created_at,
            is_finalized=_is_theme_finalized(theme.date),
        )
        for theme in themes
    ]

    return ThemeListResponse(themes=theme_responses, count=len(theme_responses))


def get_today_theme(session: Session, category: str | None = None) -> ThemeResponse:
    """Return the theme for today's date in the application timezone.

    Theme day changes at 6:00 JST, not at midnight:
    - Before 6:00 JST: Returns yesterday's theme
    - After 6:00 JST: Returns today's theme

    This matches the specification that yesterday's ranking is viewable until 6:00 AM.

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

    # Theme day changes at 6:00 JST
    # If before 6:00 JST, use yesterday's theme
    rollover_hour = settings.theme_day_rollover_hour
    if now_jst.hour < rollover_hour:
        today_date = (now_jst - timedelta(days=1)).date()
    else:
        today_date = now_jst.date()

    stmt = select(Theme).options(
        joinedload(Theme.sponsor_theme)
        .joinedload(SponsorTheme.campaign)
        .joinedload(SponsorCampaign.sponsor)
    ).where(Theme.date == today_date)

    if category:
        stmt = stmt.where(Theme.category == category)

    # Prioritize sponsored themes over AI-generated themes
    # sponsored=True comes first (descending order)
    stmt = stmt.order_by(Theme.sponsored.desc(), Theme.created_at.desc()).limit(1)

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
        sponsor_company_name=theme.sponsor_company_name,
        sponsor_official_url=_get_sponsor_url(theme),
        created_at=theme.created_at,
        is_finalized=_is_theme_finalized(theme.date),
    )


def get_theme_by_id(session: Session, theme_id: str) -> ThemeResponse:
    """Return a theme by its ID.

    Args:
        session: Database session
        theme_id: Theme identifier

    Returns:
        ThemeResponse for the specified theme

    Raises:
        HTTPException: 404 if theme not found
    """
    # Use execute/scalars/first instead of get to support options
    stmt = select(Theme).options(
        joinedload(Theme.sponsor_theme)
        .joinedload(SponsorTheme.campaign)
        .joinedload(SponsorCampaign.sponsor)
    ).where(Theme.id == theme_id)
    
    theme = session.execute(stmt).scalars().first()
    
    if not theme:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Theme with id '{theme_id}' not found"
        )

    return ThemeResponse(
        id=str(theme.id),
        text=theme.text,
        category=theme.category,
        date=theme.date,
        sponsored=theme.sponsored,
        sponsor_company_name=theme.sponsor_company_name,
        sponsor_official_url=_get_sponsor_url(theme),
        created_at=theme.created_at,
        is_finalized=_is_theme_finalized(theme.date),
    )
