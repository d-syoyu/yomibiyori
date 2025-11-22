"""Sponsor API routes for campaign and theme management."""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Annotated
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

from app.core.auth_helpers import get_current_sponsor, get_current_user
from app.db.session import get_authenticated_db_session
from app.models import Sponsor, SponsorCampaign, SponsorTheme, User
from app.schemas.sponsor import (
    SponsorCreate,
    SponsorResponse,
    SponsorUpdate,
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


def _get_sponsor_record(session: Session, user_id: str) -> Sponsor | None:
    """Return the sponsor profile for the current user if it exists."""

    return session.get(Sponsor, user_id)


@router.get("/profile", response_model=SponsorResponse)
def get_sponsor_profile(
    current_user: Annotated[User, Depends(get_current_sponsor)],
    session: Annotated[Session, Depends(get_authenticated_db_session)],
) -> SponsorResponse:
    """Return the sponsor profile associated with the authenticated sponsor."""

    sponsor = _get_sponsor_record(session, current_user.id)
    if not sponsor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sponsor profile not found",
        )

    return SponsorResponse.model_validate(sponsor)


@router.post("/profile", response_model=SponsorResponse, status_code=status.HTTP_201_CREATED)
def create_sponsor_profile(
    payload: SponsorCreate,
    current_user: Annotated[User, Depends(get_current_user)],  # Use get_current_user instead of get_current_sponsor
    session: Annotated[Session, Depends(get_authenticated_db_session)],
) -> SponsorResponse:
    """Create a sponsor profile bound to the authenticated sponsor's user ID."""

    existing = _get_sponsor_record(session, current_user.id)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Sponsor profile already exists",
        )

    now = datetime.now(timezone.utc)
    sponsor = Sponsor(
        id=current_user.id,
        company_name=payload.company_name,
        contact_email=payload.contact_email or current_user.email,
        official_url=payload.official_url,
        logo_url=payload.logo_url,
        credits=0,
        verified=False,
        created_at=now,
        updated_at=now,
    )

    # Update user role to sponsor
    current_user.role = "sponsor"
    current_user.updated_at = now

    session.add(sponsor)
    session.flush()  # Flush to get sponsor.id before creating campaign

    # Create default campaign for the sponsor
    default_campaign = SponsorCampaign(
        id=str(uuid4()),
        sponsor_id=sponsor.id,
        name="デフォルトキャンペーン",
        status="active",
        created_at=now,
        updated_at=now,
    )
    session.add(default_campaign)

    session.commit()
    session.refresh(sponsor)

    logger.info(f"Created sponsor {sponsor.id} with default campaign {default_campaign.id}")
    return SponsorResponse.model_validate(sponsor)


@router.patch("/profile", response_model=SponsorResponse)
def update_sponsor_profile(
    payload: SponsorUpdate,
    current_user: Annotated[User, Depends(get_current_sponsor)],
    session: Annotated[Session, Depends(get_authenticated_db_session)],
) -> SponsorResponse:
    """Update the authenticated sponsor's profile details."""

    sponsor = _get_sponsor_record(session, current_user.id)
    if not sponsor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sponsor profile not found",
        )

    if payload.company_name is not None:
        sponsor.company_name = payload.company_name
    if payload.contact_email is not None:
        sponsor.contact_email = payload.contact_email
    if payload.official_url is not None:
        sponsor.official_url = payload.official_url
    if payload.logo_url is not None:
        sponsor.logo_url = payload.logo_url

    sponsor.updated_at = datetime.now(timezone.utc)

    session.commit()
    session.refresh(sponsor)

    return SponsorResponse.model_validate(sponsor)


@router.post("/campaigns", response_model=CampaignResponse, status_code=status.HTTP_201_CREATED)
def create_campaign(
    payload: CampaignCreate,
    current_user: Annotated[User, Depends(get_current_sponsor)],
    session: Annotated[Session, Depends(get_authenticated_db_session)],
) -> CampaignResponse:
    """Create a new campaign."""
    sponsor = _get_sponsor_record(session, current_user.id)
    if not sponsor:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Sponsor profile not found. Please create a profile before creating campaigns.",
        )

    if not sponsor.verified and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Sponsor profile is pending verification",
        )

    now = datetime.now(timezone.utc)

    # Convert targeting to JSONB format
    targeting_json = payload.targeting.model_dump()

    campaign = SponsorCampaign(
        id=str(uuid4()),
        sponsor_id=sponsor.id,
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
    current_user: Annotated[User, Depends(get_current_sponsor)],
    session: Annotated[Session, Depends(get_authenticated_db_session)],
    status_filter: str | None = Query(None, description="Filter by status"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
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
    current_user: Annotated[User, Depends(get_current_sponsor)],
    session: Annotated[Session, Depends(get_authenticated_db_session)],
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
    current_user: Annotated[User, Depends(get_current_sponsor)],
    session: Annotated[Session, Depends(get_authenticated_db_session)],
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
    current_user: Annotated[User, Depends(get_current_sponsor)],
    session: Annotated[Session, Depends(get_authenticated_db_session)],
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
    current_user: Annotated[User, Depends(get_current_sponsor)],
    session: Annotated[Session, Depends(get_authenticated_db_session)],
) -> SponsorThemeResponse:
    """Create a new sponsor theme (theme submission). Consumes 1 credit."""
    now = datetime.now(timezone.utc)

    # Get or create campaign
    campaign = session.get(SponsorCampaign, payload.campaign_id) if payload.campaign_id else None

    if not campaign:
        # Check if user has an active campaign
        campaign = session.scalar(
            select(SponsorCampaign).where(
                SponsorCampaign.sponsor_id == current_user.id,
                SponsorCampaign.status == "active",
            ).limit(1)
        )

        if not campaign:
            # Create default campaign for the sponsor
            campaign = SponsorCampaign(
                id=str(uuid4()),
                sponsor_id=current_user.id,
                name="デフォルトキャンペーン",
                status="active",
                created_at=now,
                updated_at=now,
            )
            session.add(campaign)
            session.flush()  # Get campaign.id

    # Ensure both IDs are strings for comparison
    if str(campaign.sponsor_id) != str(current_user.id) and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to add themes to this campaign",
        )

    # Check sponsor credits
    sponsor = session.get(Sponsor, campaign.sponsor_id)
    if not sponsor or sponsor.credits < 1:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="Insufficient credits. Please purchase more credits to submit themes.",
        )

    # Check for duplicate across all campaigns from the same sponsor
    # Only block if there's already a pending or approved theme (not rejected)
    existing_in_sponsor = session.scalar(
        select(SponsorTheme)
        .join(SponsorCampaign)
        .where(
            SponsorCampaign.sponsor_id == campaign.sponsor_id,
            SponsorTheme.date == payload.date,
            SponsorTheme.category == payload.category,
            SponsorTheme.status.in_(["pending", "approved", "published"]),
        )
    )
    if existing_in_sponsor:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"この日付・カテゴリではすでにお題を投稿しています（ステータス: {existing_in_sponsor.status}）",
        )

    # Check for duplicate across all sponsors (any date/category combination can only have one approved/published theme)
    existing_global = session.scalar(
        select(SponsorTheme).where(
            SponsorTheme.date == payload.date,
            SponsorTheme.category == payload.category,
            SponsorTheme.status.in_(["approved", "published"]),
        )
    )
    if existing_global:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"この日付・カテゴリのお題は既に他のスポンサーによって承認/配信されています",
        )

    # Deduct credit
    sponsor.credits -= 1

    # Create credit transaction record
    from app.models.sponsor_credit_transaction import SponsorCreditTransaction
    credit_transaction = SponsorCreditTransaction(
        id=str(uuid4()),
        sponsor_id=sponsor.id,
        amount=-1,
        transaction_type="use",
        description=f"Theme submission: {payload.date} / {payload.category}",
        created_at=now,
    )
    session.add(credit_transaction)

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
    current_user: Annotated[User, Depends(get_current_sponsor)],
    session: Annotated[Session, Depends(get_authenticated_db_session)],
    campaign_id: str | None = Query(None, description="Filter by campaign ID"),
    status_filter: str | None = Query(None, description="Filter by status"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
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
    current_user: Annotated[User, Depends(get_current_sponsor)],
    session: Annotated[Session, Depends(get_authenticated_db_session)],
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
    current_user: Annotated[User, Depends(get_current_sponsor)],
    session: Annotated[Session, Depends(get_authenticated_db_session)],
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
    current_user: Annotated[User, Depends(get_current_sponsor)],
    session: Annotated[Session, Depends(get_authenticated_db_session)],
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
