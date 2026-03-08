"""CLI entry point for generating daily themes."""

from __future__ import annotations

import argparse
from datetime import datetime

from app.core.config import get_settings
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
    parser.add_argument(
        "--overwrite-existing-ai",
        action="store_true",
        help="Regenerate and overwrite existing AI themes for the target date.",
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

    resolved_date = args.target_date or datetime.now(settings.timezone).date()
    
    # Check if dry run
    if args.dry_run:
        print(f"Dry run for {resolved_date}: Skipping DB operations (Note: new logic always commits per category, dry-run not fully supported in batch mode yet)")
        # For dry run, we might need a different approach or just skip
        # For now, let's just exit to be safe as the function now auto-commits
        return 0

    try:
        results = generate_all_categories(
            ai_client,
            target_date=target_date,
            overwrite_existing_ai=args.overwrite_existing_ai,
        )
    except ThemeGenerationError as exc:
        print(f"[ERROR] Theme generation failed: {exc}")
        import traceback
        traceback.print_exc()
        raise SystemExit(1) from exc

    print(f"Generated {len(results.results)} theme(s) for date {resolved_date}:")
    for result in results.results:
        status = "created" if result.was_created else "updated"
        print(f" - [{status}] {result.category}: {result.generated_text}")

    if results.skipped_categories:
        print(f"Skipped existing categories: {', '.join(results.skipped_categories)}")

    if results.missing_categories:
        print(
            "[ERROR] Missing themes remain after generation: "
            f"{', '.join(results.missing_categories)}"
        )
        if results.failed_categories:
            print(f"[ERROR] Failed categories: {', '.join(results.failed_categories)}")
        raise SystemExit(1)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
