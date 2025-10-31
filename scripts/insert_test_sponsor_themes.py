"""
Insert test sponsor themes for admin panel testing
"""
import os
from datetime import date, timedelta
from uuid import uuid4
import psycopg2
from psycopg2.extras import RealDictCursor

def insert_test_data():
    """Insert test sponsor themes"""
    database_url = os.getenv("DATABASE_URL", "postgresql://postgres.avpymookdzjovwxirkpq:zE!WWbiFeNqT^u9IRaF@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres")

    conn = psycopg2.connect(database_url)
    db = conn.cursor(cursor_factory=RealDictCursor)

    try:
        # Get admin user ID
        db.execute("SELECT id FROM users WHERE role = 'admin' LIMIT 1")
        admin = db.fetchone()

        if not admin:
            print("エラー: 管理者ユーザーが見つかりません")
            return

        admin_id = admin['id']
        print(f"管理者ユーザーID: {admin_id}")

        # Create sponsor
        sponsor_id = str(uuid4())
        db.execute(
            """
            INSERT INTO sponsors (id, company_name, text, category, contact_email, official_url, plan_tier, verified)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (id) DO NOTHING
            """,
            (sponsor_id, "テスト株式会社", "テストスポンサー", "general", "test@example.com", "https://example.com", "premium", True)
        )
        print(f"スポンサー作成: {sponsor_id}")

        # Create campaign
        campaign_id = str(uuid4())
        db.execute(
            """
            INSERT INTO sponsor_campaigns (id, sponsor_id, name, status, start_date, end_date, targeting)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (id) DO NOTHING
            """,
            (campaign_id, sponsor_id, "2025年春キャンペーン", "active", date(2025, 1, 1), date(2025, 12, 31), '{}')
        )
        print(f"キャンペーン作成: {campaign_id}")

        # Create test sponsor themes
        today = date.today()
        themes = [
            (str(uuid4()), campaign_id, today, "恋愛", "春の風\nそよぐ恋路に\n花が舞う", 100, "pending", None, None, None),
            (str(uuid4()), campaign_id, today + timedelta(days=1), "季節", "桜咲く\n新しき日々\n始まりぬ", 90, "pending", None, None, None),
            (str(uuid4()), campaign_id, today + timedelta(days=2), "日常", "朝露に\n光る一日\n期待して", 80, "approved", admin_id, None, None),
            (str(uuid4()), campaign_id, today + timedelta(days=3), "ユーモア", "月曜日\n眠い目こすり\n出勤す", 70, "rejected", None, admin_id, "ユーモアとしては弱いため"),
        ]

        for theme in themes:
            db.execute(
                """
                INSERT INTO sponsor_themes
                (id, campaign_id, date, category, text_575, priority, status, approved_by, rejected_by, rejection_reason)
                VALUES
                (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO NOTHING
                """,
                theme
            )
            print(f"お題作成: {theme[3]} - {theme[6]}")

        conn.commit()
        print("\n✅ テストデータの投入が完了しました")
        print("\n統計:")
        print("- 審査待ち: 2件")
        print("- 承認済み: 1件")
        print("- 却下: 1件")
        print("- 合計: 4件")

    except Exception as e:
        conn.rollback()
        print(f"エラー: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()
        conn.close()

if __name__ == "__main__":
    insert_test_data()
