"""SQLAlchemy models for sponsor entities."""

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Sponsor(Base):
    """Represents a sponsor (advertiser) entity."""

    __tablename__ = "sponsors"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True)
    company_name: Mapped[str] = mapped_column(String(200))
    contact_email: Mapped[str | None] = mapped_column(String(320))
    official_url: Mapped[str | None] = mapped_column(Text)
    logo_url: Mapped[str | None] = mapped_column(Text)
    plan_tier: Mapped[str] = mapped_column(String(20), default="basic")
    verified: Mapped[bool] = mapped_column(Boolean, default=False)
    text: Mapped[str | None] = mapped_column(Text)
    category: Mapped[str | None] = mapped_column(String(50))
    target_regions: Mapped[list[str]] = mapped_column(ARRAY(Text), default=list)
    target_age_min: Mapped[int | None] = mapped_column(Integer)
    target_age_max: Mapped[int | None] = mapped_column(Integer)
    budget: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))

    # Relationships
    campaigns: Mapped[list["SponsorCampaign"]] = relationship(
        "SponsorCampaign",
        back_populates="sponsor",
        cascade="all, delete-orphan",
    )


class SponsorCampaign(Base):
    """Represents a sponsor advertising campaign."""

    __tablename__ = "sponsor_campaigns"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True)
    sponsor_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("sponsors.id", ondelete="CASCADE"),
    )
    name: Mapped[str] = mapped_column(String(200))
    status: Mapped[str] = mapped_column(String(20), default="draft")
    budget: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    start_date: Mapped[date | None] = mapped_column(Date)
    end_date: Mapped[date | None] = mapped_column(Date)
    targeting: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))

    # Relationships
    sponsor: Mapped["Sponsor"] = relationship("Sponsor", back_populates="campaigns")
    themes: Mapped[list["SponsorTheme"]] = relationship(
        "SponsorTheme",
        back_populates="campaign",
        cascade="all, delete-orphan",
    )


class SponsorTheme(Base):
    """Represents a sponsor-submitted theme (upper verse) pending approval."""

    __tablename__ = "sponsor_themes"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True)
    campaign_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("sponsor_campaigns.id", ondelete="CASCADE"),
    )
    date: Mapped[date] = mapped_column(Date)
    category: Mapped[str] = mapped_column(String(50))
    text_575: Mapped[str] = mapped_column(String(140))
    priority: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(20), default="pending")
    rejection_reason: Mapped[str | None] = mapped_column(Text)
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    approved_by: Mapped[str | None] = mapped_column(UUID(as_uuid=False))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))

    # Relationships
    campaign: Mapped["SponsorCampaign"] = relationship("SponsorCampaign", back_populates="themes")
