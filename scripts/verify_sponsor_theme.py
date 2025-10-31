"""Verify sponsor theme in database."""

import os
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

import psycopg2
from psycopg2.extras import RealDictCursor

# Set UTF-8 encoding for Windows
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding='utf-8')


def verify_sponsor_theme():
    """Verify sponsor theme in database."""
    # Get database URL from environment
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("❌ DATABASE_URL environment variable not set")
        sys.exit(1)

    # Connect to database
    conn = psycopg2.connect(database_url)
    cursor = conn.cursor(cursor_factory=RealDictCursor)

    try:
        # Get all themes with sponsor info
        print("\n=== All Themes (ordered by date desc) ===")
        cursor.execute(
            """
            SELECT
                id, category, date, sponsored, sponsor_company_name,
                text, created_at
            FROM themes
            ORDER BY date DESC, created_at DESC
            LIMIT 10
            """
        )
        themes = cursor.fetchall()

        for theme in themes:
            print(f"\n📅 Date: {theme['date']}")
            print(f"   Category: {theme['category']}")
            print(f"   Sponsored: {theme['sponsored']}")
            print(f"   Sponsor: {theme['sponsor_company_name']}")
            print(f"   Text: {theme['text']}")
            print(f"   ID: {theme['id']}")

        # Get sponsor themes specifically
        print("\n\n=== Sponsor Themes Only ===")
        cursor.execute(
            """
            SELECT
                id, category, date, sponsored, sponsor_company_name,
                text, created_at
            FROM themes
            WHERE sponsored = true
            ORDER BY date DESC, created_at DESC
            """
        )
        sponsor_themes = cursor.fetchall()

        if sponsor_themes:
            for theme in sponsor_themes:
                print(f"\n✨ Date: {theme['date']}")
                print(f"   Category: {theme['category']}")
                print(f"   Sponsor: {theme['sponsor_company_name']}")
                print(f"   Text: {theme['text']}")
                print(f"   ID: {theme['id']}")
        else:
            print("❌ No sponsor themes found!")

    finally:
        cursor.close()
        conn.close()


if __name__ == "__main__":
    verify_sponsor_theme()
