"""Domain services for public user profile and works."""

from __future__ import annotations

from sqlalchemy import Select, func, select
from sqlalchemy.orm import Session

from app.models import Like, Theme, User, Work
from app.schemas.work import WorkDateSummary, WorkResponse


def get_user_public_profile(session: Session, *, user_id: str) -> dict:
    """Return public profile information for a user.

    Args:
        session: Database session
        user_id: User identifier

    Returns:
        Dictionary with user's public profile data
    """
    user = session.get(User, user_id)
    if not user:
        return None

    # Count total works and likes
    works_count_stmt = select(func.count(Work.id)).where(Work.user_id == user_id)
    works_count = session.execute(works_count_stmt).scalar_one()

    likes_count_stmt = (
        select(func.count(Like.id))
        .join(Work, Like.work_id == Work.id)
        .where(Work.user_id == user_id)
    )
    total_likes = session.execute(likes_count_stmt).scalar_one()

    return {
        "user_id": user_id,
        "display_name": user.name if user.name else "Unknown",
        "profile_image_url": user.profile_image_url,
        "works_count": works_count,
        "total_likes": total_likes,
    }


def get_user_works(
    session: Session,
    *,
    user_id: str,
    limit: int = 50,
    offset: int = 0,
) -> list[WorkResponse]:
    """Return works created by a specific user.

    Args:
        session: Database session
        user_id: User identifier
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

    results = session.execute(stmt).all()

    # Build response objects
    works = []
    for work, likes_count, name, email in results:
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


def get_user_works_summary(session: Session, *, user_id: str) -> list[WorkDateSummary]:
    """Return summary of works grouped by theme date for a user.

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
