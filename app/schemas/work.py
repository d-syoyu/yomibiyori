"""Pydantic schemas for works."""

from __future__ import annotations

from datetime import date as Date
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class WorkCreate(BaseModel):
    """Payload for creating a work (lower verse / 下の句)."""

    theme_id: str = Field(
        ...,
        description="ID of the theme (upper verse / 上の句) to respond to",
    )
    text: str = Field(
        ...,
        min_length=1,
        max_length=40,
        description="Lower verse (下の句) text, ideally 7-7 syllables to continue the theme's upper verse (<= 40 chars)",
    )


class WorkResponse(BaseModel):
    """Public representation of a work (lower verse / 下の句)."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    theme_id: str
    text: str = Field(description="Lower verse (下の句) text")
    created_at: datetime
    likes_count: int = 0
    display_name: str = Field(description="Display name of the author")


class WorkLikeResponse(BaseModel):
    """Response payload for a work like action."""

    status: Literal["liked", "unliked"]
    likes_count: int = Field(ge=0, description="Current number of likes for the work")


class WorkLikeStatusResponse(BaseModel):
    """Response payload for checking like status."""

    liked: bool = Field(description="Whether the current user has liked this work")
    likes_count: int = Field(ge=0, description="Current number of likes for the work")


class WorkLikeBatchRequest(BaseModel):
    """Request payload for batch like status check."""

    work_ids: list[str] = Field(
        ...,
        min_length=1,
        max_length=100,
        description="List of work IDs to check like status for",
    )


class WorkLikeBatchStatusItem(BaseModel):
    """Single item in batch like status response."""

    work_id: str = Field(description="Work ID")
    liked: bool = Field(description="Whether the current user has liked this work")
    likes_count: int = Field(ge=0, description="Current number of likes for the work")


class WorkLikeBatchResponse(BaseModel):
    """Response payload for batch like status check."""

    items: list[WorkLikeBatchStatusItem] = Field(description="List of like statuses")


class WorkImpressionRequest(BaseModel):
    """Payload for recording a work impression."""

    viewer_hash: str | None = Field(
        default=None,
        description="Optional SHA-256 hash identifying the viewer (hex encoded)",
        min_length=64,
        max_length=64,
        pattern=r"^[0-9a-fA-F]{64}$",
    )
    count: int = Field(
        default=1,
        ge=1,
        le=20,
        description="Number of impressions to add for this event",
    )


class WorkImpressionResponse(BaseModel):
    """Response payload for a work impression."""

    status: Literal["recorded"]
    impressions_count: int = Field(ge=0, description="Current number of impressions for the work")
    unique_viewers_count: int = Field(
        ge=0,
        description="Approximate unique viewer count derived from hashed identifiers",
    )


class WorkDateSummary(BaseModel):
    """Summary of works for a specific theme date."""

    date: Date = Field(description="Theme date (テーマの日付)")
    works_count: int = Field(ge=0, description="Number of works for this date")
    total_likes: int = Field(ge=0, description="Total likes across all works for this date")
