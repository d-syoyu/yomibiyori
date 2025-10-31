"""Admin API routes for theme review and management."""

from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.auth_helpers import get_current_admin
from app.core.logging import logger
from app.db.session import get_db_session
from app.models import Sponsor, SponsorCampaign, SponsorTheme, Theme, User
from app.schemas.sponsor import (
    SponsorThemeListResponse,
    SponsorThemeResponse,
    ThemeReviewApproveRequest,
    ThemeReviewRejectRequest,
    ThemeReviewResponse,
)

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/review/themes", response_model=SponsorThemeListResponse)
def list_themes_for_review(
    status_filter: str = Query("pending", description="Filter by status"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    session: Session = Depends(get_db_session),
    _current_admin: User = Depends(get_current_admin),
) -> SponsorThemeListResponse:
    """List sponsor themes pending review."""
    stmt = select(SponsorTheme)

    if status_filter:
        stmt = stmt.where(SponsorTheme.status == status_filter)

    stmt = stmt.order_by(SponsorTheme.created_at.asc()).offset(offset).limit(limit)

    themes = session.scalars(stmt).all()

    # Get total count
    count_stmt = select(func.count()).select_from(SponsorTheme)
    if status_filter:
        count_stmt = count_stmt.where(SponsorTheme.status == status_filter)
    total = session.scalar(count_stmt) or 0

    return SponsorThemeListResponse(
        themes=[SponsorThemeResponse.model_validate(t) for t in themes],
        total=total,
    )


@router.post("/review/themes/{theme_id}/approve", response_model=ThemeReviewResponse)
def approve_theme(
    theme_id: str,
    _payload: ThemeReviewApproveRequest,
    session: Session = Depends(get_db_session),
    current_admin: User = Depends(get_current_admin),
) -> ThemeReviewResponse:
    """Approve a sponsor theme and register it to themes table for distribution."""
    sponsor_theme = session.get(SponsorTheme, theme_id)
    if not sponsor_theme:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Theme not found",
        )

    if sponsor_theme.status == "approved":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Theme is already approved",
        )

    # Get campaign and sponsor information
    campaign = session.get(SponsorCampaign, sponsor_theme.campaign_id)
    if not campaign:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found",
        )

    sponsor = session.get(Sponsor, campaign.sponsor_id)
    if not sponsor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sponsor not found",
        )

    now = datetime.now(timezone.utc)

    # Update sponsor theme status
    sponsor_theme.status = "approved"
    sponsor_theme.approved_at = now
    sponsor_theme.approved_by = current_admin.id
    sponsor_theme.updated_at = now

    # Check if a theme already exists for this date and category
    existing_theme = session.execute(
        select(Theme).where(
            Theme.date == sponsor_theme.date,
            Theme.category == sponsor_theme.category
        )
    ).scalar_one_or_none()

    if existing_theme:
        if existing_theme.sponsored:
            # Another sponsor theme already exists for this slot
            session.rollback()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Sponsor theme already exists for {sponsor_theme.date} {sponsor_theme.category}. "
                       f"Please reject or reset the existing theme first.",
            )
        else:
            # Replace AI-generated theme with sponsor theme
            logger.info(
                f"Replacing AI theme {existing_theme.id} with sponsor theme {sponsor_theme.id} "
                f"for {sponsor_theme.date} {sponsor_theme.category}"
            )
            existing_theme.text = sponsor_theme.text_575
            existing_theme.sponsored = True
            existing_theme.sponsor_theme_id = sponsor_theme.id
            existing_theme.sponsor_company_name = sponsor.company_name
    else:
        # Create new theme entry
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

    session.commit()
    session.refresh(sponsor_theme)

    return ThemeReviewResponse(
        id=sponsor_theme.id,
        status="approved",
        message=f"Theme approved and registered for distribution on {sponsor_theme.date}",
    )


@router.post("/review/themes/{theme_id}/reject", response_model=ThemeReviewResponse)
def reject_theme(
    theme_id: str,
    payload: ThemeReviewRejectRequest,
    session: Session = Depends(get_db_session),
    current_admin: User = Depends(get_current_admin),
) -> ThemeReviewResponse:
    """Reject a sponsor theme and remove it from themes table if registered."""
    sponsor_theme = session.get(SponsorTheme, theme_id)
    if not sponsor_theme:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Theme not found",
        )

    if sponsor_theme.status == "approved":
        # If already approved, remove from themes table
        existing_theme = session.execute(
            select(Theme).where(
                Theme.sponsor_theme_id == sponsor_theme.id
            )
        ).scalar_one_or_none()

        if existing_theme:
            logger.info(
                f"Removing theme {existing_theme.id} from themes table "
                f"due to sponsor theme {sponsor_theme.id} rejection"
            )
            session.delete(existing_theme)

    # Update sponsor theme status
    sponsor_theme.status = "rejected"
    sponsor_theme.rejection_reason = payload.rejection_reason
    sponsor_theme.approved_at = None
    sponsor_theme.approved_by = None
    sponsor_theme.updated_at = datetime.now(timezone.utc)

    session.commit()
    session.refresh(sponsor_theme)

    return ThemeReviewResponse(
        id=sponsor_theme.id,
        status="rejected",
        message=f"Theme has been rejected",
    )


@router.post("/review/themes/{theme_id}/reset", response_model=ThemeReviewResponse)
def reset_theme_review(
    theme_id: str,
    session: Session = Depends(get_db_session),
    _current_admin: User = Depends(get_current_admin),
) -> ThemeReviewResponse:
    """Reset a theme's review status back to pending and remove from themes table."""
    sponsor_theme = session.get(SponsorTheme, theme_id)
    if not sponsor_theme:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Theme not found",
        )

    # Remove from themes table if it was approved
    if sponsor_theme.status == "approved":
        existing_theme = session.execute(
            select(Theme).where(
                Theme.sponsor_theme_id == sponsor_theme.id
            )
        ).scalar_one_or_none()

        if existing_theme:
            logger.info(
                f"Removing theme {existing_theme.id} from themes table "
                f"due to sponsor theme {sponsor_theme.id} reset"
            )
            session.delete(existing_theme)

    # Reset status
    sponsor_theme.status = "pending"
    sponsor_theme.rejection_reason = None
    sponsor_theme.approved_at = None
    sponsor_theme.approved_by = None
    sponsor_theme.updated_at = datetime.now(timezone.utc)

    session.commit()
    session.refresh(sponsor_theme)

    return ThemeReviewResponse(
        id=sponsor_theme.id,
        status="pending",
        message=f"Theme review status has been reset to pending",
    )
