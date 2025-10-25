"""CLI entry point for sending the evening submission reminder notification."""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.services import notifications


def main() -> int:
    session: Session = SessionLocal()
    try:
        sent = notifications.send_submission_reminder_notifications(session)
    finally:
        session.close()

    print(f"Dispatched {sent} submission reminder push messages.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

