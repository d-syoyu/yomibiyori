"""今日の日付でスポンサーお題をテスト作成するスクリプト"""
import os
import sys
from datetime import datetime, timezone
from uuid import uuid4

from dotenv import load_dotenv
load_dotenv()

from sqlalchemy import create_engine, text

DATABASE_URL = os.environ.get('DATABASE_URL')
if not DATABASE_URL:
    print("ERROR: DATABASE_URL not set")
    sys.exit(1)

engine = create_engine(DATABASE_URL)

# テスト用スポンサー情報
TEST_SPONSOR_NAME = "テスト株式会社"
TEST_SPONSOR_URL = "https://example.com/test-campaign-2024"
TEST_CATEGORY = "季節"  # テストに使うカテゴリ

with engine.begin() as conn:
    # 1. テスト用スポンサーが存在するか確認、なければ作成
    result = conn.execute(text("""
        SELECT id FROM sponsors WHERE company_name = :name LIMIT 1
    """), {"name": TEST_SPONSOR_NAME})
    sponsor_row = result.fetchone()

    if sponsor_row:
        sponsor_id = str(sponsor_row[0])
        print(f"既存スポンサー使用: {sponsor_id}")
        # URLを更新
        conn.execute(text("""
            UPDATE sponsors SET official_url = :url WHERE id = :id
        """), {"id": sponsor_id, "url": TEST_SPONSOR_URL})
    else:
        # 管理者ユーザーIDを取得してスポンサーとして使用
        admin_result = conn.execute(text("""
            SELECT id FROM users WHERE role = 'admin' LIMIT 1
        """))
        admin_row = admin_result.fetchone()
        if not admin_row:
            print("ERROR: 管理者ユーザーが見つかりません")
            sys.exit(1)

        sponsor_id = str(admin_row[0])

        # スポンサーレコード作成（管理者ユーザーIDを使用）
        conn.execute(text("""
            INSERT INTO sponsors (id, company_name, contact_email, official_url, credits, verified, created_at, updated_at)
            VALUES (:id, :name, :email, :url, 10, true, NOW(), NOW())
            ON CONFLICT (id) DO UPDATE SET
                company_name = EXCLUDED.company_name,
                official_url = EXCLUDED.official_url
        """), {"id": sponsor_id, "name": TEST_SPONSOR_NAME, "email": "test-sponsor@example.com", "url": TEST_SPONSOR_URL})
        print(f"スポンサー作成（管理者ID使用）: {sponsor_id}")

    # 2. キャンペーン作成
    campaign_id = str(uuid4())
    conn.execute(text("""
        INSERT INTO sponsor_campaigns (id, sponsor_id, name, status, created_at, updated_at)
        VALUES (:id, :sponsor_id, 'テストキャンペーン', 'active', NOW(), NOW())
    """), {"id": campaign_id, "sponsor_id": sponsor_id})
    print(f"キャンペーン作成: {campaign_id}")

    # 3. スポンサーお題作成
    sponsor_theme_id = str(uuid4())
    conn.execute(text("""
        INSERT INTO sponsor_themes (id, campaign_id, date, category, text_575, sponsor_official_url, priority, status, approved_at, created_at, updated_at)
        VALUES (:id, :campaign_id, CURRENT_DATE, :category, E'夏の空\n灼けて乾いた\n喉の奥', :url, 100, 'approved', NOW(), NOW(), NOW())
    """), {"id": sponsor_theme_id, "campaign_id": campaign_id, "category": TEST_CATEGORY, "url": TEST_SPONSOR_URL})
    print(f"スポンサーお題作成: {sponsor_theme_id}")

    # 4. 既存のお題を更新（スポンサーお題として）
    conn.execute(text("""
        UPDATE themes
        SET sponsored = true,
            sponsor_theme_id = :sponsor_theme_id,
            sponsor_company_name = :sponsor_name
        WHERE date = CURRENT_DATE AND category = :category
    """), {"sponsor_theme_id": sponsor_theme_id, "sponsor_name": TEST_SPONSOR_NAME, "category": TEST_CATEGORY})
    print(f"テーマ更新完了: {TEST_CATEGORY}")

    print("\n========================================")
    print("テストデータ作成完了!")
    print("========================================")
    print(f"カテゴリ: {TEST_CATEGORY}")
    print(f"スポンサー名: {TEST_SPONSOR_NAME}")
    print(f"スポンサーURL: {TEST_SPONSOR_URL}")
    print("\nモバイルアプリで確認してください")
    print("テスト後は delete_test_sponsor_theme.py を実行して削除")
