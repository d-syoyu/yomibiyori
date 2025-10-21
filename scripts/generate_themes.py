"""CLI entry point for generating daily themes."""

from __future__ import annotations

import argparse
from datetime import date, datetime

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.session import SessionLocal
from app.services.theme_generation import ThemeGenerationError, generate_all_categories
from app.services.theme_ai_client import resolve_theme_ai_client, ThemeAIClientError


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate daily themes via AI client.")
    parser.add_argument(
        "--date",
        dest="target_date",
        type=lambda value: datetime.strptime(value, "%Y-%m-%d").date(),
        help="Target date (YYYY-MM-DD, default: today in configured timezone).",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Execute without committing changes to the database.",
    )
    return parser.parse_args()


def main() -> int:
    args = _parse_args()
    settings = get_settings()
    target_date = args.target_date

    try:
        ai_client = resolve_theme_ai_client()
    except ThemeAIClientError as exc:
        print(f"[ERROR] Failed to initialize AI client: {exc}")
        import traceback
        traceback.print_exc()
        raise SystemExit(1) from exc

    session: Session = SessionLocal()
    try:
        results = generate_all_categories(
            session,
            ai_client,
            target_date=target_date,
            commit=not args.dry_run,
        )
    except ThemeGenerationError as exc:
        session.rollback()
        print(f"[ERROR] Theme generation failed: {exc}")
        import traceback
        traceback.print_exc()
        raise SystemExit(1) from exc
    finally:
        if args.dry_run:
            session.rollback()
        session.close()

    print(f"Generated {len(results)} theme(s) for date {target_date or datetime.now(settings.timezone).date()}:")
    for result in results:
        status = "created" if result.was_created else "updated"
        print(f" - [{status}] {result.category}: {result.generated_text}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
