"""Role-based authentication helpers for sponsor and admin features."""

from __future__ import annotations

from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db_session
from app.models import User
from app.services.auth import get_current_user_id


def get_current_user(
    user_id: str = Depends(get_current_user_id),
    session: Session = Depends(get_db_session),
) -> User:
    """Get the current authenticated user object from the database."""
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    return user


def get_current_sponsor(
    user: User = Depends(get_current_user),
) -> User:
    """Verify that the current user has sponsor role."""
    if user.role not in {"sponsor", "admin"}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Sponsor role required",
        )
    return user


def get_current_admin(
    user: User = Depends(get_current_user),
) -> User:
    """Verify that the current user has admin role."""
    if user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin role required",
        )
    return user
