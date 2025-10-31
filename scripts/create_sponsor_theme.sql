-- Create sample sponsor theme for testing
-- Execute this with: railway run --service yomibiyori psql -d $DATABASE_URL -f scripts/create_sponsor_theme.sql

-- Step 1: Get admin user (we'll use the first one we find)
DO $$
DECLARE
    v_admin_id UUID;
    v_sponsor_id UUID := gen_random_uuid();
    v_campaign_id UUID := gen_random_uuid();
    v_sponsor_theme_id UUID := gen_random_uuid();
    v_theme_id UUID := gen_random_uuid();
    v_today DATE := CURRENT_DATE;
BEGIN
    -- Get admin user
    SELECT id INTO v_admin_id FROM users WHERE role = 'admin' LIMIT 1;

    IF v_admin_id IS NULL THEN
        RAISE EXCEPTION 'No admin user found. Please create an admin user first.';
    END IF;

    RAISE NOTICE 'Using admin user: %', v_admin_id;

    -- Step 2: Create sponsor
    INSERT INTO sponsors (
        id,
        company_name,
        contact_email,
        official_url,
        plan_tier,
        verified,
        created_at,
        updated_at
    ) VALUES (
        v_sponsor_id,
        'サンプル企業株式会社',
        'sponsor@example.com',
        'https://example.com',
        'premium',
        true,
        NOW(),
        NOW()
    );

    RAISE NOTICE 'Created sponsor: %', v_sponsor_id;

    -- Step 3: Create campaign
    INSERT INTO sponsor_campaigns (
        id,
        sponsor_id,
        name,
        status,
        start_date,
        end_date,
        targeting,
        created_at,
        updated_at
    ) VALUES (
        v_campaign_id,
        v_sponsor_id,
        'テストキャンペーン2025',
        'active',
        '2025-01-01',
        '2025-12-31',
        '{}',
        NOW(),
        NOW()
    );

    RAISE NOTICE 'Created campaign: %', v_campaign_id;

    -- Step 4: Create sponsor theme
    INSERT INTO sponsor_themes (
        id,
        campaign_id,
        date,
        category,
        text_575,
        priority,
        status,
        approved_at,
        approved_by,
        created_at,
        updated_at
    ) VALUES (
        v_sponsor_theme_id,
        v_campaign_id,
        v_today,
        '恋愛',
        E'春の風\nそよぐ恋路に\n花が舞う',
        100,
        'approved',
        NOW(),
        v_admin_id,
        NOW(),
        NOW()
    );

    RAISE NOTICE 'Created sponsor theme: %', v_sponsor_theme_id;

    -- Step 5: Delete existing theme for today in the same category (if exists)
    DELETE FROM themes WHERE date = v_today AND category = '恋愛';

    -- Step 6: Create theme in themes table
    INSERT INTO themes (
        id,
        text,
        category,
        date,
        sponsored,
        sponsor_theme_id,
        sponsor_company_name,
        created_at
    ) VALUES (
        v_theme_id,
        E'春の風\nそよぐ恋路に\n花が舞う',
        '恋愛',
        v_today,
        true,
        v_sponsor_theme_id,
        '提供：サンプル企業株式会社',
        NOW()
    );

    RAISE NOTICE 'Created theme: %', v_theme_id;
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'SUCCESS! Sample sponsor theme created.';
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'Sponsor ID:       %', v_sponsor_id;
    RAISE NOTICE 'Campaign ID:      %', v_campaign_id;
    RAISE NOTICE 'Sponsor Theme ID: %', v_sponsor_theme_id;
    RAISE NOTICE 'Theme ID:         %', v_theme_id;
    RAISE NOTICE '';
    RAISE NOTICE 'You can now test in the mobile app:';
    RAISE NOTICE '  Category: 恋愛';
    RAISE NOTICE '  Date: %', v_today;
    RAISE NOTICE '  Theme: 春の風 / そよぐ恋路に / 花が舞う';
    RAISE NOTICE '  Sponsor: 提供：サンプル企業株式会社';

END $$;

-- Verify the theme was created
SELECT
    id,
    category,
    date,
    sponsored,
    sponsor_company_name,
    text
FROM themes
WHERE sponsored = true
ORDER BY created_at DESC
LIMIT 1;
