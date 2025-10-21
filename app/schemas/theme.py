"""Pydantic schemas for themes."""

from __future__ import annotations

from datetime import date, datetime

from pydantic import BaseModel, ConfigDict


class ThemeResponse(BaseModel):
    """Public representation of a theme."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    text: str
    category: str
    date: date
    sponsored: bool
    created_at: datetime
