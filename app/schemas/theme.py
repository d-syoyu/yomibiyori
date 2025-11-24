"""Pydantic schemas for themes."""

from __future__ import annotations

from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field


class ThemeResponse(BaseModel):
    """Public representation of a theme (upper verse / 上の句)."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    text: str = Field(description="Upper verse (上の句) in 5-7-5 syllable format")
    category: str
    date: date
    sponsored: bool
    sponsor_company_name: str | None = Field(None, description="Sponsor company name for display (e.g., '提供：企業名')")
    sponsor_official_url: str | None = Field(None, description="Official URL of the sponsor")
    created_at: datetime
    is_finalized: bool = Field(description="Whether ranking for this theme is finalized (after 22:00 JST)")


class ThemeListResponse(BaseModel):
    """Response for listing themes."""

    themes: list[ThemeResponse]
    count: int
