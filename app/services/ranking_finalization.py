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

from app.core.analytics import EventNames, track_event
from app.core.config import get_settings
from app.models import Ranking, Theme, Work
from app.services.ranking import wilson_lower_bound


class RankingFinalizationError(RuntimeError):
    """Raised when the ranking finalization process encounters a fatal error."""


def _normalize_identifier(value: str | bytes | UUID) -> str:
    """Return a canonical hyphenated string representation of an identifier."""

    if isinstance(value, bytes):
        value = value.decode("utf-8")
    elif isinstance(value, UUID):
        return str(value)

    text = str(value)
    if len(text) == 32:
        try:
            return str(UUID(text))
        except ValueError:
            return text
    return text


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

    decoded_entries: list[tuple[str, float]] = []
    work_ids: list[str] = []
    for work_id_raw, raw_score in raw_entries:
        work_id = _normalize_identifier(work_id_raw)
        work_ids.append(work_id)
        decoded_entries.append((work_id, raw_score))

    metrics_map = _fetch_metrics(redis_client, work_ids)

    candidates: list[SnapshotEntry] = []
    for position, (work_id, raw_score) in enumerate(decoded_entries, start=1):
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

    normalized_theme_id = _normalize_identifier(theme_id)
    try:
        normalized_theme_uuid: object = UUID(normalized_theme_id)
    except ValueError:
        normalized_theme_uuid = normalized_theme_id

    rows: list[Ranking] = []
    for index, candidate in enumerate(candidates, start=1):
        work = work_map.get(candidate.work_id)
        if not work:
            continue
        score_decimal = Decimal(candidate.score).quantize(Decimal("0.00001"), rounding=ROUND_HALF_UP)
        work_identifier = _normalize_identifier(work.id)
        try:
            work_uuid: object = UUID(work_identifier)
        except ValueError:
            work_uuid = work_identifier
        rows.append(
            Ranking(
                theme_id=normalized_theme_uuid,
                work_id=work_uuid,
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
        normalized_theme_id = _normalize_identifier(theme.id)
        candidates = _collect_candidates(redis_client, theme_id=normalized_theme_id, limit=limit)
        rows = _prepare_ranking_rows(
            session,
            theme_id=normalized_theme_id,
            snapshot_time=snapshot_time,
            candidates=candidates,
        )

        delete_values: list[object]
        try:
            theme_uuid = UUID(normalized_theme_id)
            delete_values = [theme_uuid, UUID(theme_uuid.hex)]
        except ValueError:
            delete_values = [normalized_theme_id]

        session.execute(
            delete(Ranking).where(
                Ranking.theme_id.in_(delete_values)
            )
        )
        for row in rows:
            session.add(row)

        # Delete Redis key after finalizing to force fallback to DB snapshot
        redis_key = f"{settings.redis_ranking_prefix}{normalized_theme_id}"
        try:
            redis_client.delete(redis_key)
        except Exception as exc:
            # Log but don't fail finalization if Redis deletion fails
            print(f"Warning: Failed to delete Redis key {redis_key}: {exc}")

        finalised[theme.id] = rows

        track_event(
            distinct_id="system",
            event_name=EventNames.RANKING_FINALIZED,
            properties={
                "theme_id": normalized_theme_id,
                "category": theme.category,
                "entries_count": len(rows),
                "theme_date": theme.date.isoformat() if theme.date else None,
            },
        )

    session.commit()
    return finalised
