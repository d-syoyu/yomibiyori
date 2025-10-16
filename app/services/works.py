"""Domain services for works."""

from __future__ import annotations

from datetime import datetime, time, timezone
from uuid import uuid4

from fastapi import HTTPException, status
from sqlalchemy import Select, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models import Like, Theme, Work
from app.schemas.work import WorkCreate, WorkResponse

SUBMISSION_START = time(hour=6, minute=0)
SUBMISSION_END = time(hour=22, minute=0)


def _current_theme_for_submission(session: Session) -> Theme:
    """Return the theme that is currently open for submissions."""

    settings = get_settings()
    now_jst = datetime.now(settings.timezone)

    if not (SUBMISSION_START <= now_jst.time() < SUBMISSION_END):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Submissions are closed between 22:00 and 06:00 JST",
        )

    stmt: Select[Theme] = (
        select(Theme)
        .where(Theme.date == now_jst.date())
        .order_by(Theme.created_at.desc())
        .limit(1)
    )
    theme = session.execute(stmt).scalars().first()
    if not theme:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Theme not found for today")

    return theme


def create_work(session: Session, *, user_id: str, payload: WorkCreate) -> WorkResponse:
    """Create a work for the authenticated user if no previous submission exists."""

    theme = _current_theme_for_submission(session)

    existing_stmt = select(Work).where(Work.user_id == user_id, Work.theme_id == theme.id)
    if session.execute(existing_stmt).scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You have already submitted a work for this theme",
        )

    text = payload.text.strip()
    if not text:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Text cannot be empty")

    now_utc = datetime.now(timezone.utc)
    work = Work(
        id=str(uuid4()),
        user_id=user_id,
        theme_id=theme.id,
        text=text,
        created_at=now_utc,
        updated_at=now_utc,
    )

    session.add(work)

    try:
        session.commit()
    except IntegrityError as exc:
        session.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Duplicate submission detected") from exc

    session.refresh(work)

    return WorkResponse(
        id=work.id,
        user_id=work.user_id,
        theme_id=work.theme_id,
        text=work.text,
        created_at=work.created_at,
        likes_count=0,
    )


def list_works(session: Session, *, theme_id: str, limit: int) -> list[WorkResponse]:
    """Return works for the supplied theme ordered by recency."""

    theme = session.get(Theme, theme_id)
    if not theme:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Theme not found")

    stmt = (
        select(Work, func.count(Like.id).label("likes_count"))
        .outerjoin(Like, Like.work_id == Work.id)
        .where(Work.theme_id == theme_id)
        .group_by(Work.id)
        .order_by(Work.created_at.desc())
        .limit(limit)
    )

    results = session.execute(stmt).all()

    return [
        WorkResponse(
            id=work.id,
            user_id=work.user_id,
            theme_id=work.theme_id,
            text=work.text,
            created_at=work.created_at,
            likes_count=likes_count or 0,
        )
        for work, likes_count in results
    ]
