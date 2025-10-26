"""Schemas related to authentication workflows."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, EmailStr, Field


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
    display_name: str | None = None


class RefreshTokenRequest(BaseModel):
    """Payload for refreshing access token."""

    refresh_token: str = Field(min_length=1, description="Refresh token from previous login/signup")


class PasswordResetRequest(BaseModel):
    """Payload for requesting password reset email."""

    email: EmailStr


class PasswordResetResponse(BaseModel):
    """Response for password reset request."""

    message: str = "パスワードリセットメールを送信しました"


class UpdatePasswordRequest(BaseModel):
    """Payload for updating password."""

    new_password: str = Field(min_length=8, max_length=128)


class UpdatePasswordResponse(BaseModel):
    """Response for password update."""

    message: str = "パスワードを更新しました"
