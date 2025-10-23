"""Service utilities for finalising daily rankings."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, timezone
from decimal import Decimal, ROUND_HALF_UP
from typing import Sequence
from uuid import UUID

from redis import Redis
from sqlalchemy import Select, delete, select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models import Ranking, Theme, Work
from app.services.ranking import wilson_lower_bound


class RankingFinalizationError(RuntimeError):
    """Raised when the ranking finalization process encounters a fatal error."""


@dataclass(slots=True)
class SnapshotEntry:
    """Internal representation of a ranking snapshot row."""

    work_id: str
    score: float
    raw_score: float
    position: int


def _fetch_metrics(redis_client: Redis, work_ids: Sequence[str]) -> dict[str, dict[str, int]]:
    """Return per-work metrics stored in Redis hashes."""

    if not work_ids:
        return {}

    pipeline = redis_client.pipeline()
    for work_id in work_ids:
        pipeline.hgetall(f"metrics:{work_id}")
    responses = pipeline.execute()

    metrics: dict[str, dict[str, int]] = {}
    for work_id, payload in zip(work_ids, responses, strict=True):
        if isinstance(payload, dict) and payload:
            parsed: dict[str, int] = {}
            for key, value in payload.items():
                try:
                    parsed[key] = int(value)
                except (TypeError, ValueError):
                    continue
            metrics[work_id] = parsed
    return metrics


def _collect_candidates(
    redis_client: Redis,
    *,
    theme_id: str,
    limit: int,
) -> list[SnapshotEntry]:
    """Return ranking candidates from Redis with Wilson score adjustments."""

    settings = get_settings()
    key = f"{settings.redis_ranking_prefix}{theme_id}"
    raw_entries = redis_client.zrevrange(key, 0, limit - 1, withscores=True)
    if not raw_entries:
        return []

    work_ids = [work_id for work_id, _ in raw_entries]
    metrics_map = _fetch_metrics(redis_client, work_ids)

    candidates: list[SnapshotEntry] = []
    for position, (work_id, raw_score) in enumerate(raw_entries, start=1):
        metrics = metrics_map.get(work_id, {})
        likes = metrics.get("likes", 0)
        impressions = metrics.get("impressions", 0)
        unique_viewers = metrics.get("unique_viewers", 0)
        baseline = max(likes or 1, impressions, unique_viewers, 1)
        adjusted = wilson_lower_bound(likes, baseline)
        candidates.append(
            SnapshotEntry(
                work_id=work_id,
                score=float(adjusted),
                raw_score=float(raw_score),
                position=position,
            )
        )

    candidates.sort(key=lambda entry: (entry.score, entry.raw_score), reverse=True)
    return candidates


def _prepare_ranking_rows(
    session: Session,
    *,
    theme_id: str,
    snapshot_time: datetime,
    candidates: Sequence[SnapshotEntry],
) -> list[Ranking]:
    """Create Ranking ORM instances for the supplied candidates."""

    if not candidates:
        return []

    work_ids = [candidate.work_id for candidate in candidates]
    stmt: Select[Work] = select(Work).where(Work.id.in_(work_ids))
    work_map = {str(work.id): work for work in session.execute(stmt).scalars()}

    rows: list[Ranking] = []
    for index, candidate in enumerate(candidates, start=1):
        work = work_map.get(candidate.work_id)
        if not work:
            continue
        score_decimal = Decimal(candidate.score).quantize(Decimal("0.00001"), rounding=ROUND_HALF_UP)
        rows.append(
            Ranking(
                theme_id=UUID(theme_id) if isinstance(theme_id, str) else theme_id,
                work_id=UUID(work.id) if isinstance(work.id, str) else work.id,
                score=score_decimal,
                rank=index,
                snapshot_time=snapshot_time,
            )
        )
    return rows


def finalize_rankings_for_date(
    session: Session,
    redis_client: Redis,
    *,
    target_date: date | None = None,
    limit: int = 100,
) -> dict[str, list[Ranking]]:
    """Finalize rankings for all themes scheduled on the target date."""

    settings = get_settings()
    tz = settings.timezone
    resolved_date = target_date or datetime.now(tz).date()

    themes = session.execute(select(Theme).where(Theme.date == resolved_date)).scalars().all()
    if not themes:
        return {}

    snapshot_time = datetime.now(timezone.utc)
    finalised: dict[str, list[Ranking]] = {}

    for theme in themes:
        candidates = _collect_candidates(redis_client, theme_id=theme.id, limit=limit)
        rows = _prepare_ranking_rows(session, theme_id=theme.id, snapshot_time=snapshot_time, candidates=candidates)

        session.execute(delete(Ranking).where(Ranking.theme_id == theme.id))
        for row in rows:
            session.add(row)

        finalised[theme.id] = rows

    session.commit()
    return finalised
