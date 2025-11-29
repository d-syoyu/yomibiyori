-- ローカル開発用スキーマ初期化
-- docker-entrypoint-initdb.d で実行される

-- 拡張
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- publicスキーマを使用（アプリケーションのデフォルト）
SET search_path = public;

-- タイムスタンプ自動更新トリガ
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  new.updated_at = now();
  RETURN new;
END;
$$;

-- ========= ユーザー =========
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (length(name) BETWEEN 1 AND 80),
  email text UNIQUE NOT NULL CHECK (position('@' IN email) > 1),
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'sponsor', 'admin')),
  birth_year integer CHECK (birth_year IS NULL OR (birth_year BETWEEN 1900 AND 2025)),
  prefecture text CHECK (prefecture IS NULL OR length(prefecture) BETWEEN 1 AND 50),
  analytics_opt_out boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ========= スポンサー =========
CREATE TABLE IF NOT EXISTS sponsors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL CHECK (length(company_name) BETWEEN 1 AND 200),
  contact_email text,
  official_url text,
  logo_url text,
  credits integer NOT NULL DEFAULT 0,
  stripe_customer_id text,
  verified boolean NOT NULL DEFAULT false,
  text text CHECK (length(text) BETWEEN 3 AND 140),
  category text,
  target_regions text[] NOT NULL DEFAULT '{}'::text[],
  target_age_min smallint CHECK (target_age_min BETWEEN 0 AND 120),
  target_age_max smallint CHECK (target_age_max BETWEEN 0 AND 120),
  budget numeric(12,2),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_sponsors_updated_at
BEFORE UPDATE ON sponsors
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ========= スポンサーキャンペーン =========
CREATE TABLE IF NOT EXISTS sponsor_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sponsor_id uuid NOT NULL REFERENCES sponsors(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (length(name) BETWEEN 1 AND 200),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed', 'cancelled')),
  budget numeric(12,2),
  start_date date,
  end_date date CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date),
  targeting jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_sponsor_campaigns_updated_at
BEFORE UPDATE ON sponsor_campaigns
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ========= スポンサーお題 =========
CREATE TABLE IF NOT EXISTS sponsor_themes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES sponsor_campaigns(id) ON DELETE CASCADE,
  date date NOT NULL,
  category text NOT NULL CHECK (length(category) BETWEEN 1 AND 50),
  text_575 text NOT NULL CHECK (length(text_575) BETWEEN 3 AND 140),
  sponsor_official_url text,
  priority integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'published')),
  rejection_reason text,
  approved_at timestamptz,
  approved_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_sponsor_themes_updated_at
BEFORE UPDATE ON sponsor_themes
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ========= お題（上の句） =========
CREATE TABLE IF NOT EXISTS themes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  text text NOT NULL CHECK (length(text) BETWEEN 3 AND 140),
  category text NOT NULL DEFAULT 'general',
  date date NOT NULL,
  sponsored boolean NOT NULL DEFAULT false,
  sponsor_theme_id uuid REFERENCES sponsor_themes(id) ON DELETE SET NULL,
  sponsor_company_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_themes_category_date ON themes(category, date);

-- ========= 作品（下の句） =========
CREATE TABLE IF NOT EXISTS works (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  theme_id uuid NOT NULL REFERENCES themes(id) ON DELETE CASCADE,
  text varchar(40) NOT NULL CHECK (length(text) >= 1),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_works_updated_at
BEFORE UPDATE ON works
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE UNIQUE INDEX IF NOT EXISTS uq_works_user_theme ON works(user_id, theme_id);

-- ========= いいね =========
CREATE TABLE IF NOT EXISTS likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  work_id uuid NOT NULL REFERENCES works(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_likes_user_work ON likes(user_id, work_id);

-- ========= ランキング =========
CREATE TABLE IF NOT EXISTS rankings (
  id bigserial PRIMARY KEY,
  theme_id uuid NOT NULL REFERENCES themes(id) ON DELETE CASCADE,
  work_id uuid NOT NULL REFERENCES works(id) ON DELETE CASCADE,
  score numeric(8,5) NOT NULL,
  rank integer NOT NULL,
  snapshot_time timestamptz NOT NULL DEFAULT now()
);

-- ========= プッシュ通知トークン =========
CREATE TABLE IF NOT EXISTS notification_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expo_push_token text NOT NULL,
  device_id text,
  platform text,
  app_version text,
  is_active boolean NOT NULL DEFAULT true,
  last_registered_at timestamptz NOT NULL DEFAULT now(),
  last_sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_notification_tokens_push_token UNIQUE (expo_push_token)
);
CREATE TRIGGER trg_notification_tokens_updated_at
BEFORE UPDATE ON notification_tokens
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ========= スポンサーお題通知 =========
CREATE TABLE IF NOT EXISTS sponsor_theme_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sponsor_theme_id uuid NOT NULL REFERENCES sponsor_themes(id) ON DELETE CASCADE,
  sponsor_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('approved', 'rejected', 'published')),
  title text NOT NULL,
  message text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ========= スポンサーお知らせ =========
CREATE TABLE IF NOT EXISTS sponsor_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (length(title) BETWEEN 1 AND 200),
  content text NOT NULL CHECK (length(content) BETWEEN 1 AND 2000),
  type text NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'warning', 'success', 'update')),
  priority integer NOT NULL DEFAULT 0,
  is_pinned boolean NOT NULL DEFAULT false,
  is_published boolean NOT NULL DEFAULT true,
  expires_at timestamptz DEFAULT NULL,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_sponsor_announcements_updated_at
BEFORE UPDATE ON sponsor_announcements
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ========= テストデータ投入 =========
DO $$
DECLARE
    v_test_user_id UUID := '00000000-0000-0000-0000-000000000001';
    v_sponsor_id UUID := '00000000-0000-0000-0000-000000000002';
    v_campaign_id UUID := gen_random_uuid();
    v_sponsor_theme_id UUID := gen_random_uuid();
    v_theme_id UUID := gen_random_uuid();
    v_today DATE := CURRENT_DATE;
BEGIN
    -- テスト用ユーザー作成
    INSERT INTO users (id, name, email, role, created_at, updated_at)
    VALUES (v_test_user_id, 'テストユーザー', 'test@example.com', 'user', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;

    -- スポンサー用ユーザー作成
    INSERT INTO users (id, name, email, role, created_at, updated_at)
    VALUES (v_sponsor_id, 'テストスポンサー', 'sponsor@example.com', 'sponsor', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;

    -- スポンサー作成
    INSERT INTO sponsors (
        id, company_name, contact_email, official_url, verified, created_at, updated_at
    ) VALUES (
        v_sponsor_id,
        'テスト株式会社',
        'sponsor@example.com',
        'https://example.com/test-campaign-2024',
        true,
        NOW(),
        NOW()
    ) ON CONFLICT (id) DO UPDATE SET
        company_name = EXCLUDED.company_name,
        official_url = EXCLUDED.official_url;

    -- キャンペーン作成
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

    -- スポンサーお題作成（季節カテゴリ）
    INSERT INTO sponsor_themes (
        id, campaign_id, date, category, text_575, sponsor_official_url, priority, status, approved_at, created_at, updated_at
    ) VALUES (
        v_sponsor_theme_id,
        v_campaign_id,
        v_today,
        '季節',
        E'夏の空\n灼けて乾いた\n喉の奥',
        'https://example.com/test-campaign-2024',
        100,
        'approved',
        NOW(),
        NOW(),
        NOW()
    );

    -- テーマテーブルに反映
    INSERT INTO themes (
        id, text, category, date, sponsored, sponsor_theme_id, sponsor_company_name, created_at
    ) VALUES (
        v_theme_id,
        E'夏の空\n灼けて乾いた\n喉の奥',
        '季節',
        v_today,
        true,
        v_sponsor_theme_id,
        'テスト株式会社',
        NOW()
    ) ON CONFLICT DO NOTHING;

    RAISE NOTICE 'テストデータ投入完了: 季節カテゴリ, スポンサー: テスト株式会社';
END $$;
