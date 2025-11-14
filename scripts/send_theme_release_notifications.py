"""CLI entry point for sending 06:00 theme release push notifications."""

from __future__ import annotations

import argparse
from datetime import datetime

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.session import SessionLocal
from app.services.notifications import send_theme_release_notifications


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Send daily theme release push notifications.")
    parser.add_argument(
        "--date",
        dest="target_date",
        type=lambda value: datetime.strptime(value, "%Y-%m-%d").date(),
        help="Target date in YYYY-MM-DD (defaults to current app timezone date).",
    )
    return parser.parse_args()


def main() -> int:
    args = _parse_args()
    settings = get_settings()
    target_date = args.target_date or datetime.now(settings.timezone).date()

    session: Session = SessionLocal()
    try:
        result = send_theme_release_notifications(session, target_date=target_date)
    finally:
        session.close()

    print(
        f"[Theme Release] date={result.target_date} total={result.total_tokens} "
        f"sent={result.sent} failed={result.failed} disabled={result.disabled} detail={result.detail}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
