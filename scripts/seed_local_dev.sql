-- ローカル開発用テストデータ
-- 使用方法: psql -h localhost -p 5433 -U yomibiyori -d yomibiyori_dev -f scripts/seed_local_dev.sql

-- テスト用ユーザーID（Supabase認証で使用するユーザーIDに置き換えてください）
-- 自分のユーザーIDを確認するには、本番DBで SELECT id FROM users WHERE email = 'your@email.com'; を実行
DO $$
DECLARE
    v_test_user_id UUID := '00000000-0000-0000-0000-000000000001';
    v_sponsor_id UUID := '00000000-0000-0000-0000-000000000002';
    v_campaign_id UUID := gen_random_uuid();
    v_sponsor_theme_id UUID := gen_random_uuid();
    v_theme_id UUID := gen_random_uuid();
    v_today DATE := CURRENT_DATE;
BEGIN
    -- 1. テスト用ユーザー作成
    INSERT INTO users (id, name, email, role, created_at, updated_at)
    VALUES (v_test_user_id, 'テストユーザー', 'test@example.com', 'user', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;

    -- 2. スポンサー用ユーザー作成
    INSERT INTO users (id, name, email, role, created_at, updated_at)
    VALUES (v_sponsor_id, 'テストスポンサー', 'sponsor@example.com', 'sponsor', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;

    -- 3. スポンサー作成
    INSERT INTO sponsors (
        id, company_name, contact_email, official_url, credits, verified, created_at, updated_at
    ) VALUES (
        v_sponsor_id,
        'テスト株式会社',
        'sponsor@example.com',
        'https://example.com',
        10,
        true,
        NOW(),
        NOW()
    ) ON CONFLICT (id) DO UPDATE SET
        company_name = EXCLUDED.company_name,
        official_url = EXCLUDED.official_url;

    -- 4. キャンペーン作成
    INSERT INTO sponsor_campaigns (
        id, sponsor_id, name, status, created_at, updated_at
    ) VALUES (
        v_campaign_id,
        v_sponsor_id,
        'テストキャンペーン',
        'active',
        NOW(),
        NOW()
    );

    -- 5. スポンサーお題作成（sponsor_official_url付き）
    INSERT INTO sponsor_themes (
        id, campaign_id, date, category, text_575, sponsor_official_url, priority, status, approved_at, created_at, updated_at
    ) VALUES (
        v_sponsor_theme_id,
        v_campaign_id,
        v_today,
        '恋愛',
        E'春の風\nそよぐ恋路に\n花が舞う',
        'https://example.com/campaign2024',
        100,
        'approved',
        NOW(),
        NOW(),
        NOW()
    );

    -- 6. テーマテーブルに反映（モバイルアプリで表示される）
    INSERT INTO themes (
        id, text, category, date, sponsored, sponsor_theme_id, sponsor_company_name, created_at
    ) VALUES (
        v_theme_id,
        E'春の風\nそよぐ恋路に\n花が舞う',
        '恋愛',
        v_today,
        true,
        v_sponsor_theme_id,
        'テスト株式会社',
        NOW()
    ) ON CONFLICT DO NOTHING;

    RAISE NOTICE '========================================';
    RAISE NOTICE 'テストデータ投入完了';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'スポンサーお題:';
    RAISE NOTICE '  日付: %', v_today;
    RAISE NOTICE '  カテゴリ: 恋愛';
    RAISE NOTICE '  スポンサー: テスト株式会社';
    RAISE NOTICE '  URL: https://example.com/campaign2024';
    RAISE NOTICE '========================================';
END $$;

-- 確認
SELECT
    t.id,
    t.category,
    t.date,
    t.sponsored,
    t.sponsor_company_name,
    st.sponsor_official_url,
    LEFT(t.text, 30) as text_preview
FROM themes t
LEFT JOIN sponsor_themes st ON t.sponsor_theme_id = st.id
WHERE t.sponsored = true
ORDER BY t.created_at DESC
LIMIT 5;
