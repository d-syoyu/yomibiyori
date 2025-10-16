"""Pydantic schemas for works."""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class WorkCreate(BaseModel):
    """Payload for creating a work."""

    text: str = Field(..., min_length=1, max_length=100, description="Body of the poem")


class WorkResponse(BaseModel):
    """Public representation of a work."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    theme_id: str
    text: str
    created_at: datetime
    likes_count: int = 0


class WorkLikeResponse(BaseModel):
    """Response payload for a work like action."""

    status: Literal["liked"]
    likes_count: int = Field(ge=0, description="Current number of likes for the work")
