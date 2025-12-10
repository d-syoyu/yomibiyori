"""Schemas related to authentication workflows."""

from __future__ import annotations

from typing import Any, Literal, Optional

from pydantic import BaseModel, EmailStr, Field

# Gender type for profile
GenderType = Literal["male", "female", "other"]


class SignUpRequest(BaseModel):
    """Payload for creating a new Supabase user."""

    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    display_name: str = Field(min_length=1, max_length=80)


class SessionToken(BaseModel):
    """Auth session tokens issued by Supabase."""

    access_token: str
    refresh_token: str | None = None
    token_type: Literal["bearer"] = "bearer"
    expires_in: int | None = None


class SignUpResponse(BaseModel):
    """Response body for successful sign up."""

    user_id: str
    email: EmailStr
    display_name: str | None = None
    session: SessionToken | None = None


class LoginRequest(BaseModel):
    """Payload for user login."""

    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class LoginResponse(BaseModel):
    """Response body for successful login."""

    user_id: str
    email: EmailStr
    display_name: str | None = None
    session: SessionToken | None = None


class UserProfileResponse(BaseModel):
    """Public profile representation."""

    user_id: str
    email: EmailStr
    display_name: Optional[str] = None
    birth_year: Optional[int] = Field(None, description="Year of birth (e.g., 1990)")
    gender: Optional[GenderType] = Field(None, description="Gender: male, female, or other")
    prefecture: Optional[str] = Field(None, description="User's prefecture (e.g., '東京都')")
    device_info: Optional[dict[str, Any]] = Field(None, description="Device information")
    analytics_opt_out: bool = Field(False, description="Analytics opt-out preference")
    notify_theme_release: bool = Field(True, description="Receive 06:00 theme release notifications")
    notify_ranking_result: bool = Field(True, description="Receive 22:00 ranking result notifications")


class UpdateProfileRequest(BaseModel):
    """Payload for updating user profile."""

    display_name: Optional[str] = Field(None, min_length=1, max_length=80, description="New display name")
    birth_year: Optional[int] = Field(None, ge=1900, le=2025, description="Year of birth")
    gender: Optional[GenderType] = Field(None, description="Gender: male, female, or other")
    prefecture: Optional[str] = Field(None, max_length=50, description="Prefecture")
    device_info: Optional[dict[str, Any]] = Field(None, description="Device information")
    analytics_opt_out: Optional[bool] = Field(None, description="Opt out of analytics")
    notify_theme_release: Optional[bool] = Field(None, description="Allow 06:00 theme release notifications")
    notify_ranking_result: Optional[bool] = Field(None, description="Allow 22:00 ranking result notifications")


class RefreshTokenRequest(BaseModel):
    """Payload for refreshing access token."""

    refresh_token: str = Field(min_length=1, description="Refresh token from previous login/signup")


class PasswordResetRequest(BaseModel):
    """Payload for requesting password reset email."""

    email: EmailStr


class PasswordResetResponse(BaseModel):
    """Response for password reset request."""

    message: str = "パスワード再設定メールを送信しました"


class UpdatePasswordRequest(BaseModel):
    """Payload for updating password."""

    new_password: str = Field(min_length=8, max_length=128)


class UpdatePasswordResponse(BaseModel):
    """Response for password update."""

    message: str = "パスワードを更新しました"


class VerifyTokenAndUpdatePasswordRequest(BaseModel):
    """Payload for updating password with access token from email."""

    access_token: str = Field(min_length=1)
    new_password: str = Field(min_length=8, max_length=128)


class OAuthUrlResponse(BaseModel):
    """Response containing OAuth authorization URL."""

    url: str = Field(description="OAuth authorization URL to redirect the user to")
    provider: Literal["google", "apple"] = Field(description="OAuth provider name")


class OAuthCallbackRequest(BaseModel):
    """Payload for OAuth callback processing."""

    access_token: str = Field(min_length=1, description="Access token from OAuth callback")
    refresh_token: str | None = Field(default=None, description="Optional refresh token from OAuth callback")


class OAuthCallbackResponse(BaseModel):
    """Response body for successful OAuth callback processing."""

    user_id: str
    email: EmailStr
    display_name: str | None = None
    session: SessionToken | None = None
