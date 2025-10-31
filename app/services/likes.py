"""Domain services for work likes."""

from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

from fastapi import HTTPException, status
from redis import Redis
from sqlalchemy import Select, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.logging import logger
from app.core.analytics import track_event, EventNames
from app.models import Like, User, Work
from app.schemas.work import WorkLikeResponse


def like_work(
    session: Session,
    *,
    redis_client: Redis,
    user_id: str,
    work_id: str,
) -> WorkLikeResponse:
    """Register a like for the given work and update ranking metrics."""

    work = session.get(Work, work_id)
    if not work:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Work not found")

    existing_stmt = select(Like).where(Like.user_id == user_id, Like.work_id == work_id)
    if session.execute(existing_stmt).scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You have already liked this work",
        )

    like = Like(
        id=str(uuid4()),
        user_id=user_id,
        work_id=work_id,
        created_at=datetime.now(timezone.utc),
    )
    session.add(like)

    try:
        session.commit()
    except IntegrityError as exc:
        session.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You have already liked this work",
        ) from exc

    likes_count_stmt: Select[int] = select(func.count(Like.id)).where(Like.work_id == work_id)
    likes_count = session.execute(likes_count_stmt).scalar_one()

    settings = get_settings()
    ranking_key = f"{settings.redis_ranking_prefix}{work.theme_id}"
    metrics_key = f"metrics:{work_id}"

    try:
        pipeline = redis_client.pipeline()
        pipeline.zadd(ranking_key, {work_id: 0}, nx=True)
        pipeline.zincrby(ranking_key, 1, work_id)
        pipeline.hincrby(metrics_key, "likes", 1)
        pipeline.hsetnx(metrics_key, "impressions", 0)
        pipeline.hsetnx(metrics_key, "unique_viewers", 0)
        results = pipeline.execute()
        logger.debug(f"Redis pipeline executed successfully for work {work_id}")
        logger.debug(f"Pipeline updated ranking and metrics for work {work_id}")
    except Exception as exc:
        logger.error(f"Redis pipeline failed for work {work_id}: {exc}")
        # Don't fail the like operation if Redis fails - data is already in PostgreSQL

    # Track like event (respect opt-out preference)
    user = session.get(User, user_id)
    if user and not user.analytics_opt_out:
        try:
            properties = {
                "work_id": work_id,
                "theme_id": str(work.theme_id),
                "total_likes": likes_count,
            }
            # Add user attributes if available
            if user.birth_year:
                properties["birth_year"] = user.birth_year
            if user.prefecture:
                properties["prefecture"] = user.prefecture

            track_event(
                distinct_id=user_id,
                event_name=EventNames.WORK_LIKED,
                properties=properties
            )
        except Exception as exc:
            logger.error(f"[Analytics] Failed to track like: {exc}")

    return WorkLikeResponse(status="liked", likes_count=likes_count)
