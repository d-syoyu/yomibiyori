
"""Domain services for ranking retrieval."""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass
from math import sqrt
from typing import Any

from fastapi import HTTPException, status
from redis import Redis
from sqlalchemy import Select, select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models import Ranking, Theme, User, Work
from app.schemas.ranking import RankingEntry


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
    """Return ranking candidates sourced from Redis."""

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
            baseline = max(likes or 1, impressions, unique_viewers)
            adjusted = wilson_lower_bound(likes, max(baseline, 1))
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
    """Fetch ranking entries for the specified theme."""

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

        entries: list[RankingEntry] = []
        for index, candidate in enumerate(candidates, start=1):
            context = work_map.get(candidate.work_id)
            if not context:
                continue
            work, user = context
            entries.append(
                RankingEntry(
                    rank=index,
                    work_id=str(work.id),
                    score=candidate.adjusted_score,
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
