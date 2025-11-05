"""Sponsor API routes for campaign and theme management."""

from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.auth_helpers import get_current_sponsor
from app.db.session import get_db_session
from app.models import SponsorCampaign, SponsorTheme, User
from app.schemas.sponsor import (
    CampaignCreate,
    CampaignListResponse,
    CampaignResponse,
    CampaignUpdate,
    SponsorThemeCreate,
    SponsorThemeListResponse,
    SponsorThemeResponse,
    SponsorThemeUpdate,
)

router = APIRouter(prefix="/sponsor", tags=["sponsor"])


@router.post("/campaigns", response_model=CampaignResponse, status_code=status.HTTP_201_CREATED)
def create_campaign(
    payload: CampaignCreate,
    session: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_sponsor),
) -> CampaignResponse:
    """Create a new campaign."""
    now = datetime.now(timezone.utc)

    # Convert targeting to JSONB format
    targeting_json = payload.targeting.model_dump()

    campaign = SponsorCampaign(
        id=str(uuid4()),
        sponsor_id=current_user.id,
        name=payload.name,
        budget=payload.budget,
        start_date=payload.start_date,
        end_date=payload.end_date,
        targeting=targeting_json,
        created_at=now,
        updated_at=now,
    )

    session.add(campaign)
    session.commit()
    session.refresh(campaign)

    return CampaignResponse.model_validate(campaign)


@router.get("/campaigns", response_model=CampaignListResponse)
def list_campaigns(
    status_filter: str | None = Query(None, description="Filter by status"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    session: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_sponsor),
) -> CampaignListResponse:
    """List campaigns for the current sponsor."""
    stmt = select(SponsorCampaign).where(SponsorCampaign.sponsor_id == current_user.id)

    if status_filter:
        stmt = stmt.where(SponsorCampaign.status == status_filter)

    stmt = stmt.order_by(SponsorCampaign.created_at.desc()).offset(offset).limit(limit)

    campaigns = session.scalars(stmt).all()

    # Get total count
    count_stmt = select(func.count()).select_from(SponsorCampaign).where(SponsorCampaign.sponsor_id == current_user.id)
    if status_filter:
        count_stmt = count_stmt.where(SponsorCampaign.status == status_filter)
    total = session.scalar(count_stmt) or 0

    return CampaignListResponse(
        campaigns=[CampaignResponse.model_validate(c) for c in campaigns],
        total=total,
    )


@router.get("/campaigns/{campaign_id}", response_model=CampaignResponse)
def get_campaign(
    campaign_id: str,
    session: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_sponsor),
) -> CampaignResponse:
    """Get a specific campaign."""
    campaign = session.get(SponsorCampaign, campaign_id)
    if not campaign:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found",
        )

    # Verify ownership
    if campaign.sponsor_id != current_user.id and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to access this campaign",
        )

    return CampaignResponse.model_validate(campaign)


@router.patch("/campaigns/{campaign_id}", response_model=CampaignResponse)
def update_campaign(
    campaign_id: str,
    payload: CampaignUpdate,
    session: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_sponsor),
) -> CampaignResponse:
    """Update a campaign."""
    campaign = session.get(SponsorCampaign, campaign_id)
    if not campaign:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found",
        )

    # Verify ownership
    if campaign.sponsor_id != current_user.id and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to update this campaign",
        )

    # Update fields
    if payload.name is not None:
        campaign.name = payload.name
    if payload.status is not None:
        campaign.status = payload.status
    if payload.budget is not None:
        campaign.budget = payload.budget
    if payload.start_date is not None:
        campaign.start_date = payload.start_date
    if payload.end_date is not None:
        campaign.end_date = payload.end_date
    if payload.targeting is not None:
        campaign.targeting = payload.targeting.model_dump()

    campaign.updated_at = datetime.now(timezone.utc)

    session.commit()
    session.refresh(campaign)

    return CampaignResponse.model_validate(campaign)


@router.delete("/campaigns/{campaign_id}", status_code=status.HTTP_204_NO_CONTENT, response_model=None)
def delete_campaign(
    campaign_id: str,
    session: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_sponsor),
) -> None:
    """Delete a campaign."""
    campaign = session.get(SponsorCampaign, campaign_id)
    if not campaign:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found",
        )

    # Verify ownership
    if campaign.sponsor_id != current_user.id and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to delete this campaign",
        )

    session.delete(campaign)
    session.commit()


# ===== Theme Management =====


@router.post("/themes", response_model=SponsorThemeResponse, status_code=status.HTTP_201_CREATED)
def create_sponsor_theme(
    payload: SponsorThemeCreate,
    session: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_sponsor),
) -> SponsorThemeResponse:
    """Create a new sponsor theme (theme submission)."""
    now = datetime.now(timezone.utc)

    # Verify campaign ownership
    campaign = session.get(SponsorCampaign, payload.campaign_id)
    if not campaign:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found",
        )

    if campaign.sponsor_id != current_user.id and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to add themes to this campaign",
        )

    # Check for duplicate (same campaign, date, category)
    existing = session.scalar(
        select(SponsorTheme).where(
            SponsorTheme.campaign_id == payload.campaign_id,
            SponsorTheme.date == payload.date,
            SponsorTheme.category == payload.category,
        )
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A theme for this campaign, date, and category already exists",
        )

    theme = SponsorTheme(
        id=str(uuid4()),
        campaign_id=payload.campaign_id,
        date=payload.date,
        category=payload.category,
        text_575=payload.text_575,
        priority=payload.priority,
        created_at=now,
        updated_at=now,
    )

    session.add(theme)
    session.commit()
    session.refresh(theme)

    return SponsorThemeResponse.model_validate(theme)


@router.get("/themes", response_model=SponsorThemeListResponse)
def list_sponsor_themes(
    campaign_id: str | None = Query(None, description="Filter by campaign ID"),
    status_filter: str | None = Query(None, description="Filter by status"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    session: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_sponsor),
) -> SponsorThemeListResponse:
    """List sponsor themes for the current sponsor."""
    # Build query to get themes for campaigns owned by current sponsor
    stmt = (
        select(SponsorTheme)
        .join(SponsorCampaign, SponsorTheme.campaign_id == SponsorCampaign.id)
        .where(SponsorCampaign.sponsor_id == current_user.id)
    )

    if campaign_id:
        stmt = stmt.where(SponsorTheme.campaign_id == campaign_id)

    if status_filter:
        stmt = stmt.where(SponsorTheme.status == status_filter)

    stmt = stmt.order_by(SponsorTheme.created_at.desc()).offset(offset).limit(limit)

    themes = session.scalars(stmt).all()

    # Get total count
    count_stmt = (
        select(func.count())
        .select_from(SponsorTheme)
        .join(SponsorCampaign, SponsorTheme.campaign_id == SponsorCampaign.id)
        .where(SponsorCampaign.sponsor_id == current_user.id)
    )
    if campaign_id:
        count_stmt = count_stmt.where(SponsorTheme.campaign_id == campaign_id)
    if status_filter:
        count_stmt = count_stmt.where(SponsorTheme.status == status_filter)
    total = session.scalar(count_stmt) or 0

    return SponsorThemeListResponse(
        themes=[SponsorThemeResponse.model_validate(t) for t in themes],
        total=total,
    )


@router.get("/themes/{theme_id}", response_model=SponsorThemeResponse)
def get_sponsor_theme(
    theme_id: str,
    session: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_sponsor),
) -> SponsorThemeResponse:
    """Get a specific sponsor theme."""
    theme = session.get(SponsorTheme, theme_id)
    if not theme:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Theme not found",
        )

    # Verify ownership through campaign
    campaign = session.get(SponsorCampaign, theme.campaign_id)
    if not campaign or (campaign.sponsor_id != current_user.id and current_user.role != "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to access this theme",
        )

    return SponsorThemeResponse.model_validate(theme)


@router.patch("/themes/{theme_id}", response_model=SponsorThemeResponse)
def update_sponsor_theme(
    theme_id: str,
    payload: SponsorThemeUpdate,
    session: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_sponsor),
) -> SponsorThemeResponse:
    """Update a sponsor theme."""
    theme = session.get(SponsorTheme, theme_id)
    if not theme:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Theme not found",
        )

    # Verify ownership through campaign
    campaign = session.get(SponsorCampaign, theme.campaign_id)
    if not campaign or (campaign.sponsor_id != current_user.id and current_user.role != "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to update this theme",
        )

    # Only allow updates if theme is not yet approved
    if theme.status == "approved" and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot update approved themes",
        )

    # Update fields
    if payload.date is not None:
        theme.date = payload.date
    if payload.category is not None:
        theme.category = payload.category
    if payload.text_575 is not None:
        theme.text_575 = payload.text_575
    if payload.priority is not None:
        theme.priority = payload.priority

    theme.updated_at = datetime.now(timezone.utc)

    session.commit()
    session.refresh(theme)

    return SponsorThemeResponse.model_validate(theme)


@router.delete("/themes/{theme_id}", status_code=status.HTTP_204_NO_CONTENT, response_model=None)
def delete_sponsor_theme(
    theme_id: str,
    session: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_sponsor),
) -> None:
    """Delete a sponsor theme."""
    theme = session.get(SponsorTheme, theme_id)
    if not theme:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Theme not found",
        )

    # Verify ownership through campaign
    campaign = session.get(SponsorCampaign, theme.campaign_id)
    if not campaign or (campaign.sponsor_id != current_user.id and current_user.role != "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to delete this theme",
        )

    # Only allow deletion if theme is not yet approved
    if theme.status == "approved" and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot delete approved themes",
        )

    session.delete(theme)
    session.commit()
