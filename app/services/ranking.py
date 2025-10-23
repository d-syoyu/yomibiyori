
"""Domain services for ranking retrieval."""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass
from datetime import datetime, time
from math import sqrt
from typing import Any

from fastapi import HTTPException, status
from redis import Redis
from sqlalchemy import Select, select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models import Ranking, Theme, User, Work
from app.schemas.ranking import RankingEntry

# Submission window constants (same as in works.py)
SUBMISSION_START = time(hour=6, minute=0)
SUBMISSION_END = time(hour=22, minute=0)


@dataclass(slots=True)
class _Candidate:
    work_id: str
    raw_score: float
    adjusted_score: float


def wilson_lower_bound(likes: int, impressions: int, *, z: float = 1.96) -> float:
    """Return Wilson score lower bound for the supplied metrics."""

    if impressions <= 0:
        return 0.0

    phat = likes / impressions
    denominator = 1.0 + (z * z) / impressions
    centre = phat + (z * z) / (2 * impressions)
    margin = z * sqrt((phat * (1.0 - phat) + (z * z) / (4 * impressions)) / impressions)
    score = (centre - margin) / denominator
    return max(0.0, float(score))


def _calculate_time_normalization_factor(work_created_at: datetime) -> float:
    """Calculate time normalization factor to compensate for posting time bias.

    Works posted early in the day have more exposure time than works posted
    late in the day. This function returns a multiplier to normalize scores
    based on how much exposure time the work had.

    Args:
        work_created_at: When the work was created (UTC)

    Returns:
        Normalization factor (1.0 - 2.0) where later posts get higher factors
    """
    settings = get_settings()
    # Convert to JST for submission window logic
    created_jst = work_created_at.astimezone(settings.timezone)

    # Calculate submission end time on the same day
    end_datetime = created_jst.replace(
        hour=SUBMISSION_END.hour,
        minute=SUBMISSION_END.minute,
        second=0,
        microsecond=0
    )

    # If work was posted after submission end, use minimum exposure time
    if created_jst >= end_datetime:
        exposure_hours = 0.5  # Assume 30 minutes minimum
    else:
        # Calculate remaining hours until submission end
        remaining = end_datetime - created_jst
        exposure_hours = remaining.total_seconds() / 3600.0

    # Maximum exposure time is 16 hours (06:00 to 22:00)
    MAX_EXPOSURE_HOURS = 16.0

    # Normalize: works with less exposure get a boost
    # Factor ranges from 1.0 (full exposure) to 2.0 (minimal exposure)
    normalization = MAX_EXPOSURE_HOURS / max(exposure_hours, 0.5)
    # Cap at 2.0 to prevent excessive boosting
    return min(2.0, max(1.0, normalization))


def _fetch_metrics(redis_client: Redis, work_ids: Sequence[str]) -> dict[str, dict[str, Any]]:
    """Fetch per-work metrics stored alongside ranking data."""

    if not work_ids:
        return {}

    pipeline = redis_client.pipeline()
    for work_id in work_ids:
        pipeline.hgetall(f"metrics:{work_id}")
    responses = pipeline.execute()

    metrics: dict[str, dict[str, Any]] = {}
    for work_id, payload in zip(work_ids, responses, strict=True):
        if isinstance(payload, dict) and payload:
            metrics[work_id] = payload
    return metrics


def _build_candidates(redis_client: Redis, theme_id: str, limit: int) -> list[_Candidate]:
    """Return ranking candidates sourced from Redis with anomaly mitigation."""

    settings = get_settings()
    key = f"{settings.redis_ranking_prefix}{theme_id}"
    raw_entries = redis_client.zrevrange(key, 0, limit - 1, withscores=True)
    if not raw_entries:
        return []

    work_ids = [work_id for work_id, _ in raw_entries]
    metrics_map = _fetch_metrics(redis_client, work_ids)

    candidates: list[_Candidate] = []
    for position, (work_id, raw_score) in enumerate(raw_entries, start=1):
        metrics = metrics_map.get(work_id)
        adjusted = float(raw_score)
        if metrics:
            likes = int(metrics.get("likes", 0))
            impressions = int(metrics.get("impressions", 0))
            unique_viewers = int(metrics.get("unique_viewers", 0))

            # Use unique viewers as the primary denominator for fairness
            # Cap impressions to prevent manipulation (max 5 impressions per unique viewer)
            MAX_IMPRESSIONS_PER_VIEWER = 5
            capped_impressions = min(impressions, unique_viewers * MAX_IMPRESSIONS_PER_VIEWER)

            # Use unique viewers as baseline, with minimum of 1 to avoid division by zero
            # If no unique viewers yet, use capped impressions as fallback
            effective_viewers = max(unique_viewers, max(1, capped_impressions // 2))

            # Calculate Wilson score based on likes vs effective viewers
            adjusted = wilson_lower_bound(likes, effective_viewers)

            # Apply penalty for suspicious impression patterns
            if unique_viewers > 0:
                ratio = impressions / unique_viewers
                if ratio > 10.0:
                    # Apply penalty: reduce score by 20% for each 10x excess
                    penalty_factor = max(0.1, 1.0 - ((ratio - 10.0) / 10.0) * 0.2)
                    adjusted *= penalty_factor

        candidates.append(_Candidate(work_id=work_id, raw_score=float(raw_score), adjusted_score=adjusted))

    candidates.sort(key=lambda candidate: (candidate.adjusted_score, candidate.raw_score), reverse=True)
    return candidates[:limit]


def _fetch_from_snapshot(session: Session, theme_id: str, limit: int) -> list[RankingEntry]:
    """Fallback to persisted snapshot in PostgreSQL."""

    stmt: Select[tuple[Ranking, Work, User]] = (
        select(Ranking, Work, User)
        .join(Work, Ranking.work_id == Work.id)
        .join(User, Work.user_id == User.id)
        .where(Ranking.theme_id == theme_id)
        .order_by(Ranking.rank.asc())
        .limit(limit)
    )

    rows = session.execute(stmt).all()

    entries: list[RankingEntry] = []
    for ranking, work, user in rows:
        user_name = user.name
        entries.append(
            RankingEntry(
                rank=ranking.rank,
                work_id=str(ranking.work_id),
                score=float(ranking.score),
                user_name=user_name,
                text=work.text,
            )
        )
    return entries


def get_ranking(
    session: Session,
    *,
    redis_client: Redis,
    theme_id: str,
    limit: int,
) -> list[RankingEntry]:
    """Fetch ranking entries for the specified theme with time-based fairness adjustment."""

    theme = session.get(Theme, theme_id)
    if not theme:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Theme not found")

    candidates = _build_candidates(redis_client, theme_id, limit)
    if candidates:
        work_stmt: Select[tuple[Work, User]] = (
            select(Work, User)
            .join(User, Work.user_id == User.id)
            .where(Work.id.in_([candidate.work_id for candidate in candidates]))
        )
        rows = session.execute(work_stmt).all()
        work_map: dict[str, tuple[Work, User]] = {work.id: (work, user) for work, user in rows}

        # Apply time normalization and rebuild ranking
        time_adjusted_candidates: list[tuple[_Candidate, float]] = []
        for candidate in candidates:
            context = work_map.get(candidate.work_id)
            if not context:
                continue
            work, user = context
            # Calculate time normalization factor based on posting time
            time_factor = _calculate_time_normalization_factor(work.created_at)
            # Apply time normalization to the adjusted score
            time_adjusted_score = candidate.adjusted_score * time_factor
            time_adjusted_candidates.append((candidate, time_adjusted_score))

        # Re-sort by time-adjusted score
        time_adjusted_candidates.sort(key=lambda item: item[1], reverse=True)

        entries: list[RankingEntry] = []
        for index, (candidate, time_adjusted_score) in enumerate(time_adjusted_candidates, start=1):
            context = work_map.get(candidate.work_id)
            if not context:
                continue
            work, user = context
            entries.append(
                RankingEntry(
                    rank=index,
                    work_id=str(work.id),
                    score=time_adjusted_score,  # Use time-adjusted score in response
                    user_name=user.name,
                    text=work.text,
                )
            )

        if entries:
            return entries

    snapshot_entries = _fetch_from_snapshot(session, theme_id, limit)
    if not snapshot_entries:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ranking not available")

    return snapshot_entries
