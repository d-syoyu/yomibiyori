"""Domain services for works."""

from __future__ import annotations

from datetime import datetime, time, timezone
from uuid import UUID, uuid4

from redis import Redis
from fastapi import HTTPException, status
from sqlalchemy import Select, delete, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.logging import logger
from app.core.analytics import track_event, EventNames, is_sample_account, get_email_domain
from app.models import Like, Ranking, Theme, User, Work
from app.schemas.work import (
    WorkCreate,
    WorkDateSummary,
    WorkImpressionRequest,
    WorkImpressionResponse,
    WorkResponse,
    WorkUpdate,
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
            detail="投稿は6:00〜22:00の間のみ可能です",
        )

    stmt: Select[Theme] = (
        select(Theme)
        .where(Theme.date == now_jst.date())
        .order_by(Theme.created_at.desc())
        .limit(1)
    )
    theme = session.execute(stmt).scalars().first()
    if not theme:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="今日のお題がまだ届いていません")

    return theme


def create_work(session: Session, *, user_id: str, payload: WorkCreate, redis_client: Redis | None = None) -> WorkResponse:
    """Create a work for the authenticated user if no previous submission exists."""

    # Validate the specified theme exists and is submittable
    theme = session.get(Theme, payload.theme_id)
    if not theme:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="お題が見つかりませんでした",
        )

    # Check submission window (06:00-22:00 JST)
    settings = get_settings()
    now_jst = datetime.now(settings.timezone)
    if not (SUBMISSION_START <= now_jst.time() < SUBMISSION_END):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="投稿は6:00〜22:00の間のみ可能です",
        )

    # Check theme is for today
    if theme.date != now_jst.date():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="このお題は本日のものではありません",
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
            detail="このカテゴリには本日すでに投稿済みです",
        )

    text = payload.text.strip()
    if not text:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="下の句を入力してください")
    if len(text) > 40:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="下の句は40文字以内で入力してください",
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
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="すでに投稿済みです") from exc

    session.refresh(work)

    # Initialize ranking entry in Redis with score 0
    if redis_client:
        settings = get_settings()
        ranking_key = f"{settings.redis_ranking_prefix}{theme.id}"
        metrics_key = f"metrics:{work.id}"

        try:
            pipeline = redis_client.pipeline()
            # Add work to ranking ZSET with initial score of 0
            pipeline.zadd(ranking_key, {str(work.id): 0})
            # Initialize metrics
            pipeline.hset(metrics_key, mapping={
                "likes": 0,
                "impressions": 0,
                "unique_viewers": 0,
            })
            pipeline.execute()
            logger.info(f"[Works] Initialized ranking entry for work {work.id} in Redis (key: {ranking_key})")
        except Exception as exc:
            logger.error(f"[Works] Failed to initialize Redis ranking entry for work {work.id}: {exc}")
            # Don't fail the work creation if Redis fails - data is already in PostgreSQL

    # Get user info for display name and analytics
    user = session.get(User, user_id)
    display_name = user.name if user and user.name else user.email if user else "Unknown"

    # Track work creation event (respect opt-out preference)
    if user and not user.analytics_opt_out:
        try:
            properties = {
                "work_id": str(work.id),
                "theme_id": str(theme.id),
                "category": theme.category,
                "text_length": len(text),
                "is_sample_account": is_sample_account(user.email),
                "email_domain": get_email_domain(user.email),
            }
            # Add user attributes if available
            if user.birth_year:
                properties["birth_year"] = user.birth_year
            if user.prefecture:
                properties["prefecture"] = user.prefecture

            track_event(
                distinct_id=user_id,
                event_name=EventNames.WORK_CREATED,
                properties=properties
            )
        except Exception as exc:
            logger.error(f"[Analytics] Failed to track work creation: {exc}")

    return WorkResponse(
        id=str(work.id),
        user_id=str(work.user_id),
        theme_id=str(work.theme_id),
        text=work.text,
        created_at=work.created_at,
        likes_count=0,
        display_name=display_name,
    )


def _calculate_fair_score(work_created_at: datetime, likes_count: int) -> float:
    """Calculate fair score with time normalization.

    Works posted early have more exposure time, so we normalize by giving
    a boost to works posted later in the day.

    Args:
        work_created_at: When the work was created (UTC)
        likes_count: Number of likes received

    Returns:
        Fair score (higher is better)
    """
    settings = get_settings()
    SUBMISSION_END = time(hour=22, minute=0)

    # Convert to JST for submission window logic
    created_jst = work_created_at.astimezone(settings.timezone)

    # Calculate submission end time on the same day
    end_datetime = created_jst.replace(
        hour=SUBMISSION_END.hour,
        minute=SUBMISSION_END.minute,
        second=0,
        microsecond=0
    )

    # Calculate remaining hours until submission end
    if created_jst >= end_datetime:
        exposure_hours = 0.5  # Assume 30 minutes minimum
    else:
        remaining = end_datetime - created_jst
        exposure_hours = remaining.total_seconds() / 3600.0

    # Maximum exposure time is 16 hours (06:00 to 22:00)
    MAX_EXPOSURE_HOURS = 16.0

    # Normalize: works with less exposure get a boost
    # Factor ranges from 1.0 (full exposure) to 2.0 (minimal exposure)
    normalization = MAX_EXPOSURE_HOURS / max(exposure_hours, 0.5)
    normalization = min(2.0, max(1.0, normalization))

    # Calculate fair score: likes * time normalization
    return likes_count * normalization


def list_works(
    session: Session,
    *,
    theme_id: str,
    limit: int,
    order_by: str = "recent",
    exclude_user_id: str | None = None,
) -> list[WorkResponse]:
    """Return works for the supplied theme.

    Args:
        session: Database session
        theme_id: Theme identifier
        limit: Maximum number of works to return
        order_by: Sort order - "recent" (newest first) or "fair_score" (time-normalized)
        exclude_user_id: Optional user ID to exclude from results (typically the current user)

    Returns:
        List of works with likes count
    """

    theme = session.get(Theme, theme_id)
    if not theme:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="お題が見つかりませんでした")

    # Fetch all works with likes count and user name (without ordering, we'll sort in Python)
    stmt = (
        select(Work, func.count(Like.id).label("likes_count"), User.name, User.email)
        .outerjoin(Like, Like.work_id == Work.id)
        .join(User, User.id == Work.user_id)
        .where(Work.theme_id == theme_id)
        .group_by(Work.id, User.name, User.email)
    )

    # Exclude the specified user's works (e.g., current user viewing appreciation screen)
    if exclude_user_id:
        stmt = stmt.where(Work.user_id != exclude_user_id)

    results = session.execute(stmt).all()

    # Build response objects
    works_with_scores = []
    for work, likes_count, name, email in results:
        # Use name if available, otherwise fallback to email
        author_name = name if name else email

        work_response = WorkResponse(
            id=str(work.id),
            user_id=str(work.user_id),
            theme_id=str(work.theme_id),
            text=work.text,
            created_at=work.created_at,
            likes_count=likes_count or 0,
            display_name=author_name or "Unknown",
        )

        if order_by == "fair_score":
            fair_score = _calculate_fair_score(work.created_at, likes_count or 0)
            works_with_scores.append((work_response, fair_score))
        else:
            # For "recent" ordering, use timestamp as score
            works_with_scores.append((work_response, work.created_at.timestamp()))

    # Sort by score (descending)
    works_with_scores.sort(key=lambda x: x[1], reverse=True)

    # Return only the work responses (without scores), limited
    return [work_response for work_response, _ in works_with_scores[:limit]]


def list_my_works(
    session: Session,
    *,
    user_id: str,
    theme_id: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> list[WorkResponse]:
    """Return works created by the authenticated user.

    Args:
        session: Database session
        user_id: User identifier
        theme_id: Optional theme filter
        limit: Maximum number of works to return
        offset: Number of works to skip

    Returns:
        List of user's works with likes count
    """
    # Build query to fetch user's works with likes count and user name
    stmt = (
        select(Work, func.count(Like.id).label("likes_count"), User.name, User.email)
        .outerjoin(Like, Like.work_id == Work.id)
        .join(User, User.id == Work.user_id)
        .where(Work.user_id == user_id)
        .group_by(Work.id, User.name, User.email)
        .order_by(Work.created_at.desc())
        .limit(limit)
        .offset(offset)
    )

    # Add theme filter if provided
    if theme_id:
        stmt = stmt.where(Work.theme_id == theme_id)

    results = session.execute(stmt).all()

    # Build response objects
    works = []
    for work, likes_count, name, email in results:
        # Use name if available, otherwise fallback to email
        author_name = name if name else email

        work_response = WorkResponse(
            id=str(work.id),
            user_id=str(work.user_id),
            theme_id=str(work.theme_id),
            text=work.text,
            created_at=work.created_at,
            likes_count=likes_count or 0,
            display_name=author_name or "Unknown",
        )
        works.append(work_response)

    return works


def get_my_works_summary(session: Session, *, user_id: str) -> list[WorkDateSummary]:
    """Return summary of works grouped by theme date for the authenticated user.

    Args:
        session: Database session
        user_id: User identifier

    Returns:
        List of date summaries with works count and total likes, ordered by date descending
    """
    # Query to get works with their theme date and likes count
    stmt = (
        select(
            Theme.date,
            Work.id,
            func.count(Like.id).label("likes_count"),
        )
        .join(Theme, Work.theme_id == Theme.id)
        .outerjoin(Like, Like.work_id == Work.id)
        .where(Work.user_id == user_id)
        .group_by(Theme.date, Work.id)
    )

    # Get results
    results = session.execute(stmt).all()

    # Group by date and aggregate in Python
    date_summaries = {}
    for theme_date, work_id, likes_count in results:
        if theme_date not in date_summaries:
            date_summaries[theme_date] = {"works_count": 0, "total_likes": 0}
        date_summaries[theme_date]["works_count"] += 1
        date_summaries[theme_date]["total_likes"] += likes_count or 0

    # Build response objects
    summaries = [
        WorkDateSummary(
            date=date_key,
            works_count=data["works_count"],
            total_likes=data["total_likes"],
        )
        for date_key, data in date_summaries.items()
    ]

    # Sort by date descending (newest first)
    summaries.sort(key=lambda s: s.date, reverse=True)

    return summaries


def record_impression(
    session: Session,
    *,
    redis_client: Redis,
    work_id: str,
    payload: WorkImpressionRequest,
) -> WorkImpressionResponse:
    """Record an impression for the supplied work with rate limiting and anomaly detection."""

    work = session.get(Work, work_id)
    if not work:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="作品が見つかりませんでした")

    settings = get_settings()
    metrics_key = f"metrics:{work_id}"
    viewer_hash = payload.viewer_hash.lower() if payload.viewer_hash else None

    # Rate limiting: prevent rapid successive impressions from same viewer
    if viewer_hash:
        rate_limit_key = f"impression_rate:{work_id}:{viewer_hash}"
        if redis_client.exists(rate_limit_key):
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="しばらく時間をおいてからご覧ください",
            )
        # Set rate limit: 1 impression per viewer per work every 10 seconds
        redis_client.setex(rate_limit_key, 10, "1")

    # Record impression and update metrics
    pipeline = redis_client.pipeline()
    pipeline.hsetnx(metrics_key, "likes", 0)
    pipeline.hincrby(metrics_key, "impressions", payload.count)
    results = pipeline.execute()
    impressions_total = int(results[1])

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

    # Anomaly detection: check impression/viewer ratio
    if unique_viewers > 0:
        ratio = impressions_total / unique_viewers
        # If ratio exceeds 10:1, log warning (suspicious activity)
        if ratio > 10.0:
            from app.core.logging import logger

            logger.warning(
                f"Suspicious impression pattern detected for work {work_id}: "
                f"{impressions_total} impressions from {unique_viewers} viewers (ratio: {ratio:.2f})"
            )

    # Track work viewed event (use viewer_hash as distinct_id if available)
    if viewer_hash:
        try:
            track_event(
                distinct_id=viewer_hash,
                event_name=EventNames.WORK_VIEWED,
                properties={
                    "work_id": work_id,
                    "theme_id": str(work.theme_id),
                    "impressions_count": payload.count,
                },
                prehashed_distinct_id=True,
            )
        except Exception as exc:
            logger.error(f"[Analytics] Failed to track work view: {exc}")

    return WorkImpressionResponse(
        status="recorded",
        impressions_count=impressions_total,
        unique_viewers_count=max(unique_viewers, 0),
    )


def update_work(
    session: Session,
    *,
    user_id: str,
    work_id: str,
    payload: WorkUpdate,
) -> WorkResponse:
    """Update the text of an existing work owned by the authenticated user.

    Args:
        session: Database session
        user_id: Authenticated user ID
        work_id: Work identifier to update
        payload: Update payload with new text

    Returns:
        Updated work with likes count

    Raises:
        HTTPException: 404 if work not found, 403 if not owner
    """
    work = session.get(Work, work_id)
    if not work:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="作品が見つかりませんでした",
        )

    if str(work.user_id) != str(user_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="この作品を編集する権限がありません",
        )

    text = payload.text.strip()
    if not text:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="下の句を入力してください",
        )
    if len(text) > 50:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="下の句は50文字以内で入力してください",
        )

    work.text = text
    work.updated_at = datetime.now(timezone.utc)
    session.commit()
    session.refresh(work)

    likes_count = session.execute(
        select(func.count(Like.id)).where(Like.work_id == work_id)
    ).scalar_one()

    user = session.get(User, user_id)
    display_name = user.name if user and user.name else user.email if user else "Unknown"

    if user and not user.analytics_opt_out:
        try:
            track_event(
                distinct_id=user_id,
                event_name="work_updated",
                properties={
                    "work_id": str(work.id),
                    "theme_id": str(work.theme_id),
                    "text_length": len(text),
                },
            )
        except Exception as exc:
            logger.error(f"[Analytics] Failed to track work update: {exc}")

    return WorkResponse(
        id=str(work.id),
        user_id=str(work.user_id),
        theme_id=str(work.theme_id),
        text=work.text,
        created_at=work.created_at,
        likes_count=likes_count,
        display_name=display_name,
    )


def delete_work(
    session: Session,
    *,
    redis_client: Redis,
    user_id: str,
    work_id: str,
) -> None:
    """Delete a work owned by the authenticated user and clean up related data.

    Args:
        session: Database session
        redis_client: Redis client for cleaning up ranking data
        user_id: Authenticated user ID
        work_id: Work identifier to delete

    Raises:
        HTTPException: 404 if work not found, 403 if not owner
    """
    work = session.get(Work, work_id)
    if not work:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="作品が見つかりませんでした",
        )

    if str(work.user_id) != str(user_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="この作品を削除する権限がありません",
        )

    theme_id = work.theme_id

    # Track analytics before deletion (get user info)
    user = session.get(User, user_id)
    if user and not user.analytics_opt_out:
        try:
            track_event(
                distinct_id=user_id,
                event_name="work_deleted",
                properties={
                    "work_id": work_id,
                    "theme_id": str(theme_id),
                },
            )
        except Exception as exc:
            logger.error(f"[Analytics] Failed to track work deletion: {exc}")

    # Delete from rankings table (confirmed ranking snapshots)
    session.execute(delete(Ranking).where(Ranking.work_id == UUID(work_id)))

    # Delete work (likes are CASCADE deleted)
    session.delete(work)
    session.commit()

    # Clean up Redis data (best-effort)
    settings = get_settings()
    ranking_key = f"{settings.redis_ranking_prefix}{theme_id}"
    metrics_key = f"metrics:{work_id}"

    try:
        pipeline = redis_client.pipeline()
        pipeline.zrem(ranking_key, work_id)
        pipeline.delete(metrics_key)
        pipeline.execute()
        logger.info(f"[Works] Cleaned up Redis data for deleted work {work_id}")
    except Exception as exc:
        logger.error(f"[Works] Failed to clean Redis for work {work_id}: {exc}")
