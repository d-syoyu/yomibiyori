"""Pydantic schemas for ranking responses."""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict


class RankingEntry(BaseModel):
    """Single ranking row as exposed by the API."""

    model_config = ConfigDict(from_attributes=True)

    rank: int
    work_id: str
    user_id: str
    score: float
    display_name: str
    text: str
    profile_image_url: str | None = None
