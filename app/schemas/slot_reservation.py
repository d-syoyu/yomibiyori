"""Pydantic schemas for sponsor slot reservations."""

from datetime import date as DateType
from datetime import datetime as DateTimeType
from uuid import UUID

from pydantic import BaseModel, Field


class SlotAvailability(BaseModel):
    """Availability information for a specific date and category."""

    date: DateType
    category: str
    is_available: bool
    reserved_by_sponsor_id: UUID | None = None
    reserved_at: DateTimeType | None = None


class SlotReservationCreate(BaseModel):
    """Request to reserve a slot."""

    date: DateType = Field(..., description="Date to reserve the slot for")
    category: str = Field(..., description="Category (恋愛/季節/日常/ユーモア)")


class SlotReservationResponse(BaseModel):
    """Response for a slot reservation."""

    id: UUID
    sponsor_id: UUID
    date: DateType
    category: str
    status: str  # reserved/used/cancelled
    reserved_at: DateTimeType
    created_at: DateTimeType
    updated_at: DateTimeType

    class Config:
        from_attributes = True


class SlotReservationCancel(BaseModel):
    """Request to cancel a slot reservation."""

    reservation_id: UUID = Field(..., description="ID of the reservation to cancel")
