"""Domain services for works."""

from __future__ import annotations

from datetime import datetime, time, timezone
from uuid import uuid4

from redis import Redis
from fastapi import HTTPException, status
from sqlalchemy import Select, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models import Like, Theme, Work
from app.schemas.work import (
    WorkCreate,
    WorkImpressionRequest,
    WorkImpressionResponse,
    WorkResponse,
)

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

    # Validate the specified theme exists and is submittable
    theme = session.get(Theme, payload.theme_id)
    if not theme:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Theme with id '{payload.theme_id}' not found",
        )

    # Check submission window (06:00-22:00 JST)
    settings = get_settings()
    now_jst = datetime.now(settings.timezone)
    if not (SUBMISSION_START <= now_jst.time() < SUBMISSION_END):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Submissions are closed between 22:00 and 06:00 JST",
        )

    # Check theme is for today
    if theme.date != now_jst.date():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Theme is not for today (theme date: {theme.date}, today: {now_jst.date()})",
        )

    # Check user hasn't already submitted for this category today
    existing_today_stmt: Select[str] = (
        select(Work.id)
        .join(Theme, Theme.id == Work.theme_id)
        .where(
            Work.user_id == user_id,
            Theme.date == theme.date,
            Theme.category == theme.category,
        )
        .limit(1)
    )
    if session.execute(existing_today_stmt).scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You have already submitted a work today for this category",
        )

    text = payload.text.strip()
    if not text:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Text cannot be empty")
    if len(text) > 40:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Text must be 40 characters or fewer",
        )

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
        id=str(work.id),
        user_id=str(work.user_id),
        theme_id=str(work.theme_id),
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
            id=str(work.id),
            user_id=str(work.user_id),
            theme_id=str(work.theme_id),
            text=work.text,
            created_at=work.created_at,
            likes_count=likes_count or 0,
        )
        for work, likes_count in results
    ]


def record_impression(
    session: Session,
    *,
    redis_client: Redis,
    work_id: str,
    payload: WorkImpressionRequest,
) -> WorkImpressionResponse:
    """Record an impression for the supplied work."""

    work = session.get(Work, work_id)
    if not work:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Work not found")

    settings = get_settings()
    metrics_key = f"metrics:{work_id}"

    pipeline = redis_client.pipeline()
    pipeline.hsetnx(metrics_key, "likes", 0)
    pipeline.hincrby(metrics_key, "impressions", payload.count)
    results = pipeline.execute()
    impressions_total = int(results[1])

    viewer_hash = payload.viewer_hash.lower() if payload.viewer_hash else None
    unique_viewers = 0
    if viewer_hash:
        day_bucket = datetime.now(settings.timezone).strftime("%Y%m%d")
        dedupe_key = f"impressions:{work_id}:{day_bucket}"
        redis_client.pfadd(dedupe_key, viewer_hash)
        # Maintain two days of history to bridge midnight transitions.
        redis_client.expire(dedupe_key, 172800)
        unique_viewers = int(redis_client.pfcount(dedupe_key))
        redis_client.hset(metrics_key, mapping={"unique_viewers": unique_viewers})
    else:
        stored_unique = redis_client.hget(metrics_key, "unique_viewers")
        if stored_unique is not None:
            try:
                unique_viewers = int(stored_unique)
            except (TypeError, ValueError):
                unique_viewers = 0

    return WorkImpressionResponse(
        status="recorded",
        impressions_count=impressions_total,
        unique_viewers_count=max(unique_viewers, 0),
    )
