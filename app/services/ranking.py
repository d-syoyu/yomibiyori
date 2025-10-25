
"""Domain services for ranking retrieval."""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass
from datetime import datetime, time
from math import sqrt
from typing import Any

from fastapi import HTTPException, status
from redis import Redis
from sqlalchemy import Select, select, or_
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.logging import logger
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


def bayesian_average(likes: int, impressions: int, *, prior_mean: float = 0.05, prior_confidence: int = 100) -> float:
    """Calculate Bayesian average to handle low sample sizes fairly.

    For works with few impressions, this provides a more stable estimate by
    incorporating prior knowledge (global average like rate).

    Args:
        likes: Number of likes received
        impressions: Number of impressions (views)
        prior_mean: Prior expectation of like rate (default: 5%)
        prior_confidence: Confidence in prior (equivalent sample size, default: 100)

    Returns:
        Bayesian average like rate (0.0 - 1.0)
    """
    if impressions <= 0:
        return prior_mean

    # Bayesian average formula: (prior_confidence * prior_mean + impressions * observed_rate) / (prior_confidence + impressions)
    observed_rate = likes / impressions
    weighted_score = (prior_confidence * prior_mean + impressions * observed_rate) / (prior_confidence + impressions)
    return max(0.0, min(1.0, float(weighted_score)))


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
            decoded_payload: dict[str, Any] = {}
            for key, value in payload.items():
                decoded_key = key.decode("utf-8") if isinstance(key, bytes) else str(key)
                if isinstance(value, bytes):
                    try:
                        decoded_value: Any = value.decode("utf-8")
                    except UnicodeDecodeError:
                        decoded_value = value
                else:
                    decoded_value = value
                decoded_payload[decoded_key] = decoded_value
            metrics[work_id] = decoded_payload
    return metrics


def _build_candidates(redis_client: Redis, theme_id: str, limit: int) -> list[_Candidate]:
    """Return ranking candidates with Bayesian average and Wilson score hybrid approach.

    This function implements a multi-stage fairness algorithm:
    1. Calculate effective sample size (using unique viewers)
    2. For low samples (<100 impressions): Use Bayesian average
    3. For high samples (>=100 impressions): Use Wilson confidence interval
    4. Apply anomaly detection penalties
    """

    settings = get_settings()
    key = f"{settings.redis_ranking_prefix}{theme_id}"
    logger.debug(f"Attempting to read ranking from Redis (theme_id={theme_id})")
    try:
        raw_entries = redis_client.zrevrange(key, 0, limit - 1, withscores=True)
        logger.debug(f"Redis zrevrange returned {len(raw_entries)} entries for theme {theme_id}")
        if not raw_entries:
            logger.debug(f"No ranking data found in Redis for theme {theme_id}")
            return []
    except Exception as exc:
        logger.error(f"Redis read failed for theme {theme_id}: {exc}")
        return []

    work_ids: list[str] = []
    decoded_entries: list[tuple[str, float]] = []
    for work_id_raw, score in raw_entries:
        work_id = work_id_raw.decode("utf-8") if isinstance(work_id_raw, bytes) else str(work_id_raw)
        work_ids.append(work_id)
        decoded_entries.append((work_id, score))

    metrics_map = _fetch_metrics(redis_client, work_ids)

    # Threshold for switching between Bayesian and Wilson
    IMPRESSION_THRESHOLD = 100
    # Prior parameters for Bayesian average
    PRIOR_LIKE_RATE = 0.05  # 5% global average like rate
    PRIOR_CONFIDENCE = 100  # Equivalent to 100 impressions of prior data

    candidates: list[_Candidate] = []
    for position, (work_id, raw_score) in enumerate(decoded_entries, start=1):
        metrics = metrics_map.get(work_id)
        adjusted = float(raw_score)
        if metrics:
            likes = int(metrics.get("likes", 0))
            impressions = int(metrics.get("impressions", 0))
            unique_viewers = int(metrics.get("unique_viewers", 0))

            if unique_viewers <= 0:
                # Fallback to impressions when unique viewer telemetry is unavailable
                effective_sample_size = max(1, impressions)
                capped_impressions = impressions
            else:
                # Stage 1: Calculate effective sample size
                # Use unique viewers as the primary denominator for fairness
                # Cap impressions to prevent manipulation (max 5 impressions per unique viewer)
                MAX_IMPRESSIONS_PER_VIEWER = 5
                capped_impressions = min(impressions, unique_viewers * MAX_IMPRESSIONS_PER_VIEWER)

                # Use unique viewers as baseline, with minimum of 1 to avoid division by zero
                # If no unique viewers yet, use capped impressions as fallback
                effective_sample_size = max(unique_viewers, max(1, capped_impressions // 2))

            # Ensure capped impressions have a sensible fallback for later calculations
            if capped_impressions <= 0 and impressions > 0:
                capped_impressions = impressions

            # Stage 2 & 3: Choose scoring method based on sample size
            if effective_sample_size < IMPRESSION_THRESHOLD:
                # Low sample size: Use Bayesian average for stability
                adjusted = bayesian_average(
                    likes,
                    effective_sample_size,
                    prior_mean=PRIOR_LIKE_RATE,
                    prior_confidence=PRIOR_CONFIDENCE
                )
            else:
                # High sample size: Use Wilson score for confidence
                adjusted = wilson_lower_bound(likes, effective_sample_size)

            # Stage 4: Apply penalty for suspicious impression patterns
            if unique_viewers > 0 and impressions > 0:
                ratio = impressions / unique_viewers
                if ratio > 10.0:
                    # Suspicious pattern: reduce score by 20% for each 10x excess
                    penalty_factor = max(0.1, 1.0 - ((ratio - 10.0) / 10.0) * 0.2)
                    adjusted *= penalty_factor

        candidates.append(_Candidate(work_id=work_id, raw_score=float(raw_score), adjusted_score=adjusted))

    candidates.sort(key=lambda candidate: (candidate.adjusted_score, candidate.raw_score), reverse=True)
    return candidates[:limit]


def _fetch_from_snapshot(session: Session, theme_id: str, limit: int) -> list[RankingEntry]:
    """Fallback to persisted snapshot in PostgreSQL."""

    from uuid import UUID

    stmt: Select[Ranking] = select(Ranking).order_by(Ranking.rank.asc())
    ranking_rows = session.execute(stmt).scalars().all()

    def _normalize_theme(value: object) -> tuple[str, str | None]:
        if isinstance(value, UUID):
            return (str(value), value.hex)
        text_value = str(value)
        try:
            parsed = UUID(text_value)
            return (text_value, parsed.hex)
        except ValueError:
            return (text_value, None)

    normalized_query_id, normalized_hex = _normalize_theme(theme_id)

    entries: list[RankingEntry] = []
    for ranking in ranking_rows:
        ranking_theme, ranking_hex = _normalize_theme(ranking.theme_id)
        if ranking_theme != normalized_query_id and ranking_hex != normalized_query_id and (
            normalized_hex is None or (ranking_theme != normalized_hex and ranking_hex != normalized_hex)
        ):
            continue

        work_id_value = ranking.work_id
        if isinstance(work_id_value, UUID):
            work_id_str = str(work_id_value)
        else:
            work_id_str = str(work_id_value)
            if len(work_id_str) == 32:
                try:
                    work_id_str = str(UUID(work_id_str))
                except ValueError:
                    pass

        work = session.get(Work, work_id_str)
        if not work:
            continue
        user = session.get(User, work.user_id)
        if not user:
            continue

        display_name = user.name if user.name else user.email
        entries.append(
            RankingEntry(
                rank=ranking.rank,
                work_id=str(work.id),
                score=float(ranking.score),
                display_name=display_name,
                text=work.text,
            )
        )
        if len(entries) >= limit:
            break
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
            display_name = user.name if user.name else user.email
            entries.append(
                RankingEntry(
                    rank=index,
                    work_id=str(work.id),
                    score=time_adjusted_score,  # Use time-adjusted score in response
                    display_name=display_name,
                    text=work.text,
                )
            )

        if entries:
            return entries

    # Fallback to persisted snapshot
    snapshot_entries = _fetch_from_snapshot(session, theme_id, limit)
    if snapshot_entries:
        return snapshot_entries

    # Return empty list if no works have been submitted yet (not an error condition)
    return []
