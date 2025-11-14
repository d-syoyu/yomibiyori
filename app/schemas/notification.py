"""Schemas for notification token APIs."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field, field_validator


class NotificationTokenCreate(BaseModel):
    """Payload for registering an Expo push token."""

    expo_push_token: str = Field(..., min_length=10, max_length=255, description="ExponentPushToken[...] value from Expo SDK")
    device_id: str | None = Field(None, description="Device identifier or name")
    platform: str | None = Field(None, description="OS platform (ios / android)")
    app_version: str | None = Field(None, description="App version string")

    @field_validator("expo_push_token")
    @classmethod
    def validate_push_token(cls, value: str) -> str:
        """Ensure Expo tokens follow expected prefix."""

        token = value.strip()
        if not token.startswith("ExponentPushToken["):
            raise ValueError("Expo push token must start with 'ExponentPushToken['")
        return token


class NotificationTokenResponse(BaseModel):
    """Response payload for registered tokens."""

    id: str
    expo_push_token: str
    device_id: str | None = None
    platform: str | None = None
    app_version: str | None = None
    is_active: bool
    last_registered_at: datetime

    class Config:
        from_attributes = True
