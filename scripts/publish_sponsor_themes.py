"""Publish approved sponsor themes that are due for distribution."""

from __future__ import annotations

import logging
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.session import SessionLocal
from app.models import SponsorTheme, Theme

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)


def publish_due_themes(session: Session) -> int:
    """Mark approved sponsor themes as published when their date has arrived.

    Returns:
        Number of themes marked as published.
    """
    settings = get_settings()
    today_jst = datetime.now(settings.timezone).date()
    now_utc = datetime.now(timezone.utc)

    # Only publish themes that have been synced to themes table (actual distribution targets).
    stmt = (
        select(SponsorTheme)
        .join(Theme, Theme.sponsor_theme_id == SponsorTheme.id)
        .where(
            SponsorTheme.status == "approved",
            SponsorTheme.date <= today_jst,
        )
    )
    due_themes = session.execute(stmt).scalars().all()

    if not due_themes:
        logger.info("No approved sponsor themes to publish for %s", today_jst)
        return 0

    for theme in due_themes:
        logger.info("Publishing sponsor theme %s for %s %s", theme.id, theme.date, theme.category)
        theme.status = "published"
        theme.updated_at = now_utc

    session.commit()
    logger.info("Published %d sponsor themes", len(due_themes))
    return len(due_themes)


def main() -> int:
    session: Session = SessionLocal()
    try:
        count = publish_due_themes(session)
        print(f"Published {count} sponsor themes")
        return 0
    except Exception as exc:  # pragma: no cover - script entrypoint
        session.rollback()
        logger.exception("Failed to publish sponsor themes: %s", exc)
        return 1
    finally:
        session.close()


if __name__ == "__main__":
    raise SystemExit(main())
