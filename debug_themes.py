"""Debug script to check today's themes."""

import os
import sys
from datetime import datetime

# Add app to path
sys.path.insert(0, os.path.dirname(__file__))

from app.core.config import get_settings
from app.db.session import SessionLocal
from app.models import Theme
from sqlalchemy import select

def main():
    settings = get_settings()

    # Get today's date in JST
    today_jst = datetime.now(settings.timezone).date()
    print(f"Today (JST): {today_jst}")
    print(f"Redis Ranking Prefix: {settings.redis_ranking_prefix}")

    # Query today's themes
    session = SessionLocal()
    try:
        stmt = select(Theme).where(Theme.date == today_jst).order_by(Theme.category)
        themes = session.execute(stmt).scalars().all()

        print(f"\nFound {len(themes)} themes for today:")
        for theme in themes:
            print(f"  Category: {theme.category}")
            print(f"  ID: {theme.id}")
            print(f"  Text: {theme.text}")
            print(f"  Redis key: {settings.redis_ranking_prefix}{theme.id}")
            print()
    finally:
        session.close()

if __name__ == "__main__":
    main()
