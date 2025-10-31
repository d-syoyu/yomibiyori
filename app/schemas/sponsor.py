"""Pydantic schemas for sponsor endpoints."""

from datetime import date, datetime
from decimal import Decimal
from typing import Any, Optional

from pydantic import BaseModel, EmailStr, Field


# ===== Sponsor Schemas =====


class SponsorBase(BaseModel):
    """Base sponsor information."""

    company_name: str = Field(..., min_length=1, max_length=200)
    contact_email: Optional[EmailStr] = None
    official_url: Optional[str] = None
    logo_url: Optional[str] = None
    plan_tier: str = Field(default="basic", pattern="^(basic|standard|premium)$")


class SponsorCreate(SponsorBase):
    """Create a new sponsor."""

    pass


class SponsorUpdate(BaseModel):
    """Update sponsor information."""

    company_name: Optional[str] = Field(None, min_length=1, max_length=200)
    contact_email: Optional[EmailStr] = None
    official_url: Optional[str] = None
    logo_url: Optional[str] = None
    plan_tier: Optional[str] = Field(None, pattern="^(basic|standard|premium)$")


class SponsorResponse(SponsorBase):
    """Sponsor response."""

    id: str
    verified: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ===== Campaign Schemas =====


class CampaignTargeting(BaseModel):
    """Campaign targeting criteria."""

    region: list[str] = Field(default_factory=list)
    age_band: list[str] = Field(default_factory=list)
    os: list[str] = Field(default_factory=list)


class CampaignBase(BaseModel):
    """Base campaign information."""

    name: str = Field(..., min_length=1, max_length=200)
    budget: Optional[Decimal] = Field(None, ge=0)
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    targeting: CampaignTargeting = Field(default_factory=CampaignTargeting)


class CampaignCreate(CampaignBase):
    """Create a new campaign."""

    pass


class CampaignUpdate(BaseModel):
    """Update campaign information."""

    name: Optional[str] = Field(None, min_length=1, max_length=200)
    status: Optional[str] = Field(None, pattern="^(draft|active|paused|completed|cancelled)$")
    budget: Optional[Decimal] = Field(None, ge=0)
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    targeting: Optional[CampaignTargeting] = None


class CampaignResponse(CampaignBase):
    """Campaign response."""

    id: str
    sponsor_id: str
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CampaignListResponse(BaseModel):
    """List of campaigns."""

    campaigns: list[CampaignResponse]
    total: int


# ===== Sponsor Theme Schemas =====


class SponsorThemeBase(BaseModel):
    """Base sponsor theme information."""

    date: date
    category: str = Field(..., min_length=1, max_length=50)
    text_575: str = Field(..., min_length=3, max_length=140, description="Upper verse (5-7-5)")
    priority: int = Field(default=0, description="Slot priority (higher = preferred)")


class SponsorThemeCreate(SponsorThemeBase):
    """Create a new sponsor theme."""

    campaign_id: str


class SponsorThemeUpdate(BaseModel):
    """Update sponsor theme information."""

    date: Optional[date] = None
    category: Optional[str] = Field(None, min_length=1, max_length=50)
    text_575: Optional[str] = Field(None, min_length=3, max_length=140)
    priority: Optional[int] = None


class SponsorThemeResponse(SponsorThemeBase):
    """Sponsor theme response."""

    id: str
    campaign_id: str
    status: str
    rejection_reason: Optional[str] = None
    approved_at: Optional[datetime] = None
    approved_by: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class SponsorThemeListResponse(BaseModel):
    """List of sponsor themes."""

    themes: list[SponsorThemeResponse]
    total: int


# ===== Review Schemas =====


class ThemeReviewApproveRequest(BaseModel):
    """Approve a sponsor theme."""

    pass


class ThemeReviewRejectRequest(BaseModel):
    """Reject a sponsor theme."""

    rejection_reason: str = Field(..., min_length=1, max_length=500)


class ThemeReviewResponse(BaseModel):
    """Theme review response."""

    id: str
    status: str
    message: str
