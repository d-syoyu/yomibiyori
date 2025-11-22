"""Pydantic schemas for sponsor slot reservations."""

from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, Field


class SlotAvailability(BaseModel):
    """Availability information for a specific date and category."""

    date: date
    category: str
    is_available: bool
    reserved_by_sponsor_id: UUID | None = None
    reserved_at: datetime | None = None


class SlotReservationCreate(BaseModel):
    """Request to reserve a slot."""

    date: date = Field(..., description="Date to reserve the slot for")
    category: str = Field(..., description="Category (恋愛/季節/日常/ユーモア)")


class SlotReservationResponse(BaseModel):
    """Response for a slot reservation."""

    id: UUID
    sponsor_id: UUID
    date: date
    category: str
    status: str  # reserved/used/cancelled
    reserved_at: datetime
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class SlotReservationCancel(BaseModel):
    """Request to cancel a slot reservation."""

    reservation_id: UUID = Field(..., description="ID of the reservation to cancel")
