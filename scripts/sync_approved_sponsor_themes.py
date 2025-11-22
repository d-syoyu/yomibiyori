"""Sync approved sponsor themes to themes table.

This script finds all approved sponsor themes and ensures they are
properly reflected in the themes table.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.session import SessionLocal
from app.models import Sponsor, SponsorCampaign, SponsorTheme, Theme

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)


def sync_approved_themes(session: Session) -> int:
    """Sync all approved sponsor themes to themes table.

    Returns:
        Number of themes synced
    """
    # Find all approved sponsor themes
    approved_themes = session.execute(
        select(SponsorTheme).where(SponsorTheme.status == "approved")
    ).scalars().all()

    synced_count = 0

    for sponsor_theme in approved_themes:
        # Get campaign and sponsor info
        campaign = session.get(SponsorCampaign, sponsor_theme.campaign_id)
        if not campaign:
            logger.warning(f"Campaign not found for sponsor theme {sponsor_theme.id}")
            continue

        sponsor = session.get(Sponsor, campaign.sponsor_id)
        if not sponsor:
            logger.warning(f"Sponsor not found for campaign {campaign.id}")
            continue

        # Check if theme already exists
        existing_theme = session.execute(
            select(Theme).where(
                Theme.date == sponsor_theme.date,
                Theme.category == sponsor_theme.category
            )
        ).scalar_one_or_none()

        now = datetime.now(timezone.utc)

        if existing_theme:
            # Update existing theme
            logger.info(
                f"Updating theme {existing_theme.id} with sponsor theme {sponsor_theme.id} "
                f"for {sponsor_theme.date} {sponsor_theme.category}"
            )
            existing_theme.text = sponsor_theme.text_575
            existing_theme.sponsored = True
            existing_theme.sponsor_theme_id = sponsor_theme.id
            existing_theme.sponsor_company_name = sponsor.company_name
            synced_count += 1
        else:
            # Create new theme
            logger.info(
                f"Creating new theme from sponsor theme {sponsor_theme.id} "
                f"for {sponsor_theme.date} {sponsor_theme.category}"
            )
            new_theme = Theme(
                id=str(uuid4()),
                text=sponsor_theme.text_575,
                category=sponsor_theme.category,
                date=sponsor_theme.date,
                sponsored=True,
                sponsor_theme_id=sponsor_theme.id,
                sponsor_company_name=sponsor.company_name,
                created_at=now,
            )
            session.add(new_theme)
            synced_count += 1

    session.commit()
    return synced_count


def main() -> int:
    """Run the sync script."""
    session: Session = SessionLocal()

    try:
        count = sync_approved_themes(session)
        print(f"Successfully synced {count} approved sponsor themes to themes table")
        return 0
    except Exception as exc:
        session.rollback()
        print(f"Error syncing themes: {exc}")
        import traceback
        traceback.print_exc()
        return 1
    finally:
        session.close()


if __name__ == "__main__":
    raise SystemExit(main())
