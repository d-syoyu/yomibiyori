"""Admin API routes for theme review and management."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.auth_helpers import get_current_admin
from app.db.session import get_session
from app.models import SponsorTheme, User
from app.schemas.sponsor import (
    SponsorThemeListResponse,
    SponsorThemeResponse,
    ThemeReviewApproveRequest,
    ThemeReviewRejectRequest,
    ThemeReviewResponse,
)

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/review/themes", response_model=SponsorThemeListResponse)
def list_themes_for_review(
    status_filter: str = Query("pending", description="Filter by status"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    session: Session = Depends(get_session),
    _current_admin: User = Depends(get_current_admin),
) -> SponsorThemeListResponse:
    """List sponsor themes pending review."""
    stmt = select(SponsorTheme)

    if status_filter:
        stmt = stmt.where(SponsorTheme.status == status_filter)

    stmt = stmt.order_by(SponsorTheme.created_at.asc()).offset(offset).limit(limit)

    themes = session.scalars(stmt).all()

    # Get total count
    count_stmt = select(func.count()).select_from(SponsorTheme)
    if status_filter:
        count_stmt = count_stmt.where(SponsorTheme.status == status_filter)
    total = session.scalar(count_stmt) or 0

    return SponsorThemeListResponse(
        themes=[SponsorThemeResponse.model_validate(t) for t in themes],
        total=total,
    )


@router.post("/review/themes/{theme_id}/approve", response_model=ThemeReviewResponse)
def approve_theme(
    theme_id: str,
    _payload: ThemeReviewApproveRequest,
    session: Session = Depends(get_session),
    current_admin: User = Depends(get_current_admin),
) -> ThemeReviewResponse:
    """Approve a sponsor theme."""
    theme = session.get(SponsorTheme, theme_id)
    if not theme:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Theme not found",
        )

    if theme.status == "approved":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Theme is already approved",
        )

    # Update theme status
    theme.status = "approved"
    theme.approved_at = datetime.now(timezone.utc)
    theme.approved_by = current_admin.id
    theme.updated_at = datetime.now(timezone.utc)

    session.commit()
    session.refresh(theme)

    return ThemeReviewResponse(
        id=theme.id,
        status="approved",
        message=f"Theme {theme.id} has been approved successfully",
    )


@router.post("/review/themes/{theme_id}/reject", response_model=ThemeReviewResponse)
def reject_theme(
    theme_id: str,
    payload: ThemeReviewRejectRequest,
    session: Session = Depends(get_session),
    current_admin: User = Depends(get_current_admin),
) -> ThemeReviewResponse:
    """Reject a sponsor theme."""
    theme = session.get(SponsorTheme, theme_id)
    if not theme:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Theme not found",
        )

    if theme.status == "approved":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot reject an approved theme",
        )

    # Update theme status
    theme.status = "rejected"
    theme.rejection_reason = payload.rejection_reason
    theme.updated_at = datetime.now(timezone.utc)

    session.commit()
    session.refresh(theme)

    return ThemeReviewResponse(
        id=theme.id,
        status="rejected",
        message=f"Theme {theme.id} has been rejected",
    )


@router.post("/review/themes/{theme_id}/reset", response_model=ThemeReviewResponse)
def reset_theme_review(
    theme_id: str,
    session: Session = Depends(get_session),
    _current_admin: User = Depends(get_current_admin),
) -> ThemeReviewResponse:
    """Reset a theme's review status back to pending."""
    theme = session.get(SponsorTheme, theme_id)
    if not theme:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Theme not found",
        )

    # Reset status
    theme.status = "pending"
    theme.rejection_reason = None
    theme.approved_at = None
    theme.approved_by = None
    theme.updated_at = datetime.now(timezone.utc)

    session.commit()
    session.refresh(theme)

    return ThemeReviewResponse(
        id=theme.id,
        status="pending",
        message=f"Theme {theme.id} review status has been reset to pending",
    )
