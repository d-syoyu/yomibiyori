"""CLI entry point for sending the morning theme release notification."""

from __future__ import annotations

import argparse
from datetime import datetime

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.session import SessionLocal
from app.services import notifications


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Send theme release notifications for a specific date.")
    parser.add_argument(
        "--date",
        dest="target_date",
        type=lambda value: datetime.strptime(value, "%Y-%m-%d").date(),
        help="Target date (YYYY-MM-DD, default: today in configured timezone).",
    )
    return parser.parse_args()


def main() -> int:
    args = _parse_args()
    settings = get_settings()

    resolved_date = args.target_date or datetime.now(settings.timezone).date()
    target_datetime = datetime.combine(resolved_date, datetime.min.time(), tzinfo=settings.timezone)

    session: Session = SessionLocal()
    try:
        sent = notifications.send_theme_release_notifications(session, target_date=target_datetime)
    finally:
        session.close()

    print(f"Dispatched {sent} theme release push messages for {resolved_date}.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
