"""CLI entry point for finalising daily rankings."""

from __future__ import annotations

import argparse
from datetime import datetime

from redis import Redis
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.redis import get_redis_client
from app.db.session import SessionLocal
from app.services.ranking_finalization import finalize_rankings_for_date
from app.services import notifications


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Finalize daily rankings from Redis snapshots.")
    parser.add_argument(
        "--date",
        dest="target_date",
        type=lambda value: datetime.strptime(value, "%Y-%m-%d").date(),
        help="Target date (YYYY-MM-DD, default: today in configured timezone).",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=100,
        help="Maximum number of works to snapshot per theme (default: 100).",
    )
    return parser.parse_args()


def main() -> int:
    args = _parse_args()
    settings = get_settings()
    target_date = args.target_date

    resolved_date = target_date or datetime.now(settings.timezone).date()
    session: Session = SessionLocal()
    redis_client: Redis = get_redis_client()
    try:
        summary = finalize_rankings_for_date(
            session,
            redis_client,
            target_date=target_date,
            limit=args.limit,
        )
        if summary:
            notifications.send_ranking_finalized_notifications(
                session,
                target_date=datetime.combine(resolved_date, datetime.min.time(), tzinfo=settings.timezone),
            )
    finally:
        session.close()

    print(f"Finalized rankings for date {resolved_date}:")
    for theme_id, entries in summary.items():
        print(f" - theme {theme_id}: {len(entries)} entries")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
