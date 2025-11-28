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
from app.core.analytics import track_event, EventNames, is_sample_account, get_email_domain
from app.models import Like, User, Work
from app.schemas.work import (
    WorkLikeBatchResponse,
    WorkLikeBatchStatusItem,
    WorkLikeResponse,
    WorkLikeStatusResponse,
)


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

    # Cannot like your own work
    if work.user_id == user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You cannot like your own work",
        )

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
                event_name=EventNames.WORK_LIKED,
                properties=properties
            )
        except Exception as exc:
            logger.error(f"[Analytics] Failed to track like: {exc}")

    return WorkLikeResponse(status="liked", likes_count=likes_count)


def unlike_work(
    session: Session,
    *,
    redis_client: Redis,
    user_id: str,
    work_id: str,
) -> WorkLikeResponse:
    """Remove a like from the given work and update ranking metrics."""

    work = session.get(Work, work_id)
    if not work:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Work not found")

    existing_stmt = select(Like).where(Like.user_id == user_id, Like.work_id == work_id)
    existing_like = session.execute(existing_stmt).scalar_one_or_none()
    if not existing_like:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="You have not liked this work",
        )

    session.delete(existing_like)
    session.commit()

    likes_count_stmt: Select[int] = select(func.count(Like.id)).where(Like.work_id == work_id)
    likes_count = session.execute(likes_count_stmt).scalar_one()

    settings = get_settings()
    ranking_key = f"{settings.redis_ranking_prefix}{work.theme_id}"
    metrics_key = f"metrics:{work_id}"

    try:
        pipeline = redis_client.pipeline()
        pipeline.zincrby(ranking_key, -1, work_id)
        pipeline.hincrby(metrics_key, "likes", -1)
        pipeline.execute()
        logger.debug(f"Redis pipeline executed successfully for unlike work {work_id}")
    except Exception as exc:
        logger.error(f"Redis pipeline failed for unlike work {work_id}: {exc}")

    # Track unlike event (respect opt-out preference)
    user = session.get(User, user_id)
    if user and not user.analytics_opt_out:
        try:
            properties = {
                "work_id": work_id,
                "theme_id": str(work.theme_id),
                "total_likes": likes_count,
                "is_sample_account": is_sample_account(user.email),
                "email_domain": get_email_domain(user.email),
            }
            if user.birth_year:
                properties["birth_year"] = user.birth_year
            if user.prefecture:
                properties["prefecture"] = user.prefecture

            track_event(
                distinct_id=user_id,
                event_name=EventNames.WORK_UNLIKED,
                properties=properties
            )
        except Exception as exc:
            logger.error(f"[Analytics] Failed to track unlike: {exc}")

    return WorkLikeResponse(status="unliked", likes_count=likes_count)


def toggle_like(
    session: Session,
    *,
    redis_client: Redis,
    user_id: str,
    work_id: str,
) -> WorkLikeResponse:
    """Toggle like status for the given work."""

    work = session.get(Work, work_id)
    if not work:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Work not found")

    # Cannot like your own work
    if work.user_id == user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You cannot like your own work",
        )

    existing_stmt = select(Like).where(Like.user_id == user_id, Like.work_id == work_id)
    existing_like = session.execute(existing_stmt).scalar_one_or_none()

    if existing_like:
        return unlike_work(session, redis_client=redis_client, user_id=user_id, work_id=work_id)
    else:
        return like_work(session, redis_client=redis_client, user_id=user_id, work_id=work_id)


def get_like_status(
    session: Session,
    *,
    user_id: str,
    work_id: str,
) -> WorkLikeStatusResponse:
    """Get like status for a single work."""

    work = session.get(Work, work_id)
    if not work:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Work not found")

    existing_stmt = select(Like).where(Like.user_id == user_id, Like.work_id == work_id)
    liked = session.execute(existing_stmt).scalar_one_or_none() is not None

    likes_count_stmt: Select[int] = select(func.count(Like.id)).where(Like.work_id == work_id)
    likes_count = session.execute(likes_count_stmt).scalar_one()

    return WorkLikeStatusResponse(liked=liked, likes_count=likes_count)


def get_like_status_batch(
    session: Session,
    *,
    user_id: str,
    work_ids: list[str],
) -> WorkLikeBatchResponse:
    """Get like status for multiple works."""

    logger.info(f"[Likes] get_like_status_batch called: user_id={user_id}, work_ids={work_ids}")

    if not work_ids:
        return WorkLikeBatchResponse(items=[])

    # Get all likes by this user for the specified works
    user_likes_stmt = select(Like.work_id).where(
        Like.user_id == user_id,
        Like.work_id.in_(work_ids),
    )
    # Convert UUIDs to strings for comparison
    user_liked_work_ids = {str(wid) for wid in session.execute(user_likes_stmt).scalars().all()}
    logger.info(f"[Likes] User liked work IDs: {user_liked_work_ids}")

    # Get like counts for all works
    likes_count_stmt = (
        select(Like.work_id, func.count(Like.id).label("count"))
        .where(Like.work_id.in_(work_ids))
        .group_by(Like.work_id)
    )
    # Convert UUID keys to strings for comparison
    likes_counts = {str(row.work_id): row.count for row in session.execute(likes_count_stmt).all()}
    logger.info(f"[Likes] Likes counts: {likes_counts}")

    items = [
        WorkLikeBatchStatusItem(
            work_id=work_id,
            liked=work_id in user_liked_work_ids,
            likes_count=likes_counts.get(work_id, 0),
        )
        for work_id in work_ids
    ]

    return WorkLikeBatchResponse(items=items)
