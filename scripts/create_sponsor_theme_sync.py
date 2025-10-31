"""Create a sample sponsor theme for testing (synchronous version)."""

import os
import sys
from datetime import date, datetime, timezone
from pathlib import Path
from uuid import uuid4

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

import psycopg2
from psycopg2.extras import RealDictCursor

# Set UTF-8 encoding for Windows
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding='utf-8')


def create_sample_sponsor_theme():
    """Create a sample sponsor theme for testing."""
    # Get database URL from environment
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("❌ DATABASE_URL environment variable not set")
        sys.exit(1)

    # Connect to database
    conn = psycopg2.connect(database_url)
    conn.autocommit = False
    cursor = conn.cursor(cursor_factory=RealDictCursor)

    try:
        # 1. Get admin user
        print("\n=== Step 1: Check for admin user ===")
        cursor.execute("SELECT id, email FROM users WHERE role = 'admin' LIMIT 1")
        admin_user = cursor.fetchone()

        if not admin_user:
            print("❌ No admin user found. Please create an admin user first.")
            print("Run: python scripts/set_user_role.py <user_id> admin")
            conn.close()
            return

        admin_id = admin_user["id"]
        print(f"✅ Found admin user: {admin_user['email']} (ID: {admin_id})")

        # 2. Create sponsor
        print("\n=== Step 2: Create sponsor ===")
        sponsor_id = str(uuid4())
        cursor.execute(
            """
            INSERT INTO sponsors (
                id, company_name, text, category, target_regions,
                contact_email, official_url,
                plan_tier, verified, created_at, updated_at
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
            )
            """,
            (
                sponsor_id,
                "サンプル企業株式会社",
                "テスト用のスポンサー企業です",  # text field
                "general",  # category field
                [],  # target_regions - empty array
                "sponsor@example.com",
                "https://example.com",
                "premium",
                True,
                datetime.now(timezone.utc),
                datetime.now(timezone.utc),
            ),
        )
        print(f"✅ Created sponsor: サンプル企業株式会社 (ID: {sponsor_id})")

        # 3. Create campaign
        print("\n=== Step 3: Create campaign ===")
        campaign_id = str(uuid4())
        cursor.execute(
            """
            INSERT INTO sponsor_campaigns (
                id, sponsor_id, name, status, start_date, end_date,
                targeting, created_at, updated_at
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s
            )
            """,
            (
                campaign_id,
                sponsor_id,
                "テストキャンペーン2025",
                "active",
                date(2025, 1, 1),
                date(2025, 12, 31),
                "{}",
                datetime.now(timezone.utc),
                datetime.now(timezone.utc),
            ),
        )
        print(f"✅ Created campaign: テストキャンペーン2025 (ID: {campaign_id})")

        # 4. Create sponsor theme
        print("\n=== Step 4: Create sponsor theme ===")
        sponsor_theme_id = str(uuid4())
        # Use 2025-10-31 for Railway server timezone
        today = date(2025, 10, 31)
        theme_text = "春の風\nそよぐ恋路に\n花が舞う"
        category = "恋愛"

        cursor.execute(
            """
            INSERT INTO sponsor_themes (
                id, campaign_id, date, category, text_575,
                priority, status, approved_at, approved_by,
                created_at, updated_at
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
            )
            """,
            (
                sponsor_theme_id,
                campaign_id,
                today,
                category,
                theme_text,
                100,
                "approved",
                datetime.now(timezone.utc),
                admin_id,
                datetime.now(timezone.utc),
                datetime.now(timezone.utc),
            ),
        )
        print(f"✅ Created sponsor theme: {theme_text}")
        print(f"   Category: {category}")
        print(f"   Date: {today}")
        print(f"   Status: approved")

        # 5. Delete existing theme for today in the same category (if exists)
        print("\n=== Step 5: Remove existing theme for today ===")
        cursor.execute(
            "DELETE FROM themes WHERE date = %s AND category = %s",
            (today, category),
        )
        print(f"✅ Removed existing themes for {today} / {category}")

        # 6. Create theme in themes table
        print("\n=== Step 6: Create theme in themes table ===")
        theme_id = str(uuid4())
        cursor.execute(
            """
            INSERT INTO themes (
                id, text, category, date, sponsored,
                sponsor_theme_id, sponsor_company_name, created_at
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s
            )
            """,
            (
                theme_id,
                theme_text,
                category,
                today,
                True,
                sponsor_theme_id,
                "提供：サンプル企業株式会社",
                datetime.now(timezone.utc),
            ),
        )
        print(f"✅ Created theme: {theme_text}")
        print(f"   Sponsored: True")
        print(f"   Sponsor: 提供：サンプル企業株式会社")
        print(f"   Category: {category}")
        print(f"   Date: {today}")

        # Commit all changes
        conn.commit()
        print("\n✅ All data committed successfully!")

        # Print summary
        print("\n" + "=" * 60)
        print("📋 SUMMARY")
        print("=" * 60)
        print(f"Sponsor ID:       {sponsor_id}")
        print(f"Campaign ID:      {campaign_id}")
        print(f"Sponsor Theme ID: {sponsor_theme_id}")
        print(f"Theme ID:         {theme_id}")
        print(f"\n🎯 You can now test the sponsored theme in the mobile app!")
        print(f"   Category: {category}")
        print(f"   Date: {today}")
        print(f"   Theme text: {theme_text}")
        print(f"   Sponsor: 提供：サンプル企業株式会社")

        # Verify
        print("\n=== Verification ===")
        cursor.execute(
            """
            SELECT id, category, date, sponsored, sponsor_company_name, text
            FROM themes
            WHERE sponsored = true
            ORDER BY created_at DESC
            LIMIT 1
            """
        )
        result = cursor.fetchone()
        if result:
            print("✅ Verified sponsor theme in database:")
            print(f"   ID: {result['id']}")
            print(f"   Category: {result['category']}")
            print(f"   Date: {result['date']}")
            print(f"   Sponsor: {result['sponsor_company_name']}")

    except Exception as e:
        print(f"\n❌ Error: {e}")
        conn.rollback()
        raise
    finally:
        cursor.close()
        conn.close()


if __name__ == "__main__":
    create_sample_sponsor_theme()
