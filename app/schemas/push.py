"""Pydantic schemas for push subscription endpoints."""

from __future__ import annotations

from pydantic import BaseModel, Field


class PushSubscriptionCreate(BaseModel):
    """Payload for registering or updating an Expo push token."""

    expo_token: str = Field(..., min_length=10, max_length=255, description="Expo push notification token")
