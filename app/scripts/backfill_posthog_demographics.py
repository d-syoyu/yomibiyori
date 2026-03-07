"""Backfill demographics person properties to PostHog for existing users."""

from __future__ import annotations

import argparse
import sys
import time

from sqlalchemy import or_, select

from app.core.analytics import build_person_properties, get_posthog_client, identify_user
from app.db.session import SessionLocal
from app.models.user import User


def _build_person_properties(user: User) -> dict:
    return build_person_properties(
        display_name=user.name,
        email=user.email,
        birth_year=user.birth_year,
        gender=user.gender,
        prefecture=user.prefecture,
    )


def run(*, dry_run: bool, batch_size: int) -> None:
    client = get_posthog_client()
    if client is None and not dry_run:
        print("[Backfill] PostHog client could not be initialized. Check POSTHOG_API_KEY.")
        sys.exit(1)

    session = SessionLocal()
    try:
        stmt = (
            select(User)
            .where(User.analytics_opt_out.is_(False))
            .where(
                or_(
                    User.birth_year.isnot(None),
                    User.gender.isnot(None),
                    User.prefecture.isnot(None),
                )
            )
            .order_by(User.created_at)
        )
        users = session.execute(stmt).scalars().all()
    finally:
        session.close()

    total = len(users)
    print(f"[Backfill] users={total}")

    if dry_run:
        print("[Backfill] dry-run mode: no data will be sent to PostHog")
        for user in users[:5]:
            props = _build_person_properties(user)
            print(f"  user_id={user.id} props={props}")
        if total > 5:
            print(f"  ... remaining={total - 5}")
        return

    sent = 0
    failed = 0
    for i in range(0, total, batch_size):
        batch = users[i : i + batch_size]
        for user in batch:
            try:
                identify_user(
                    distinct_id=str(user.id),
                    properties=_build_person_properties(user),
                )
                sent += 1
            except Exception as e:
                print(f"[Backfill] ERROR user_id={user.id}: {e}")
                failed += 1

        print(f"[Backfill] progress={min(i + batch_size, total)}/{total}")
        time.sleep(0.1)

    if client:
        try:
            client.shutdown()
        except Exception:
            pass

    print(f"[Backfill] done sent={sent} failed={failed}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Backfill demographics person properties in PostHog")
    parser.add_argument("--dry-run", action="store_true", help="Preview affected users without sending data")
    parser.add_argument("--batch", type=int, default=100, help="Batch size to send (default: 100)")
    args = parser.parse_args()

    run(dry_run=args.dry_run, batch_size=args.batch)


if __name__ == "__main__":
    main()
