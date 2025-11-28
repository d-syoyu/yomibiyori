-- スポンサー統一通知テーブル
-- お題関連（承認/却下/配信）とアカウント関連（承認/クレジット）を統一管理

CREATE TABLE IF NOT EXISTS sponsor_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sponsor_id uuid NOT NULL REFERENCES sponsors(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN (
    'account_verified',   -- アカウント承認
    'account_rejected',   -- アカウント却下
    'theme_approved',     -- お題承認
    'theme_rejected',     -- お題却下
    'theme_published',    -- お題配信
    'credit_added',       -- クレジット追加
    'credit_used',        -- クレジット使用
    'system'              -- システム通知
  )),
  title text NOT NULL,
  message text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  sponsor_theme_id uuid REFERENCES sponsor_themes(id) ON DELETE CASCADE,  -- お題関連の場合のみ
  extra_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sponsor_notifications_sponsor ON sponsor_notifications(sponsor_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sponsor_notifications_theme ON sponsor_notifications(sponsor_theme_id) WHERE sponsor_theme_id IS NOT NULL;

COMMENT ON TABLE sponsor_notifications IS 'スポンサー向け統一通知（お題・アカウント・クレジット）';
COMMENT ON COLUMN sponsor_notifications.type IS '通知タイプ';
COMMENT ON COLUMN sponsor_notifications.sponsor_theme_id IS 'お題関連通知の場合のお題ID';
COMMENT ON COLUMN sponsor_notifications.extra_data IS '追加データ（JSONBフォーマット）';

-- RLS設定
ALTER TABLE sponsor_notifications ENABLE ROW LEVEL SECURITY;

-- 自分宛の通知のみ閲覧可能
DROP POLICY IF EXISTS read_own_sponsor_notifications ON sponsor_notifications;
CREATE POLICY read_own_sponsor_notifications ON sponsor_notifications
  FOR SELECT
  USING (sponsor_id = auth.uid());

-- 自分の通知のみ更新可能（既読状態など）
DROP POLICY IF EXISTS update_own_sponsor_notifications ON sponsor_notifications;
CREATE POLICY update_own_sponsor_notifications ON sponsor_notifications
  FOR UPDATE
  USING (sponsor_id = auth.uid())
  WITH CHECK (sponsor_id = auth.uid());

-- 管理者とシステムのみ作成可能
DROP POLICY IF EXISTS insert_sponsor_notifications ON sponsor_notifications;
CREATE POLICY insert_sponsor_notifications ON sponsor_notifications
  FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );


-- ========================================
-- お題ステータス変更時の通知トリガー（新テーブル用）
-- ========================================

CREATE OR REPLACE FUNCTION public.notify_sponsor_theme_status_change_v2()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_sponsor_id uuid;
  v_title text;
  v_message text;
  v_type text;
BEGIN
  -- ステータスが変更された場合のみ処理
  IF (TG_OP = 'UPDATE' AND OLD.status = NEW.status) THEN
    RETURN NEW;
  END IF;

  -- approved, rejected, published の場合のみ通知
  IF NEW.status NOT IN ('approved', 'rejected', 'published') THEN
    RETURN NEW;
  END IF;

  -- スポンサーIDを取得（campaign経由）
  SELECT sc.sponsor_id INTO v_sponsor_id
  FROM sponsor_campaigns sc
  WHERE sc.id = NEW.campaign_id;

  IF v_sponsor_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- 通知タイプとメッセージを生成
  CASE NEW.status
    WHEN 'approved' THEN
      v_type := 'theme_approved';
      v_title := 'お題が承認されました';
      v_message := 'お題「' || NEW.text_575 || '」が審査を通過し、承認されました。配信日: ' || to_char(NEW.date, 'YYYY年MM月DD日');
    WHEN 'rejected' THEN
      v_type := 'theme_rejected';
      v_title := 'お題が却下されました';
      IF NEW.rejection_reason IS NOT NULL AND NEW.rejection_reason != '' THEN
        v_message := 'お題「' || NEW.text_575 || '」は審査の結果、却下されました。理由: ' || NEW.rejection_reason;
      ELSE
        v_message := 'お題「' || NEW.text_575 || '」は審査の結果、却下されました。';
      END IF;
    WHEN 'published' THEN
      v_type := 'theme_published';
      v_title := 'お題が配信されました';
      v_message := 'お題「' || NEW.text_575 || '」が配信されました。ユーザーの反応をインサイトページでご確認いただけます。';
  END CASE;

  -- 統一通知テーブルに作成
  INSERT INTO sponsor_notifications (
    sponsor_id,
    type,
    title,
    message,
    sponsor_theme_id
  ) VALUES (
    v_sponsor_id,
    v_type,
    v_title,
    v_message,
    NEW.id
  );

  RETURN NEW;
END;
$$;

-- 新しいトリガーを適用（古いトリガーがあれば削除）
DROP TRIGGER IF EXISTS trg_sponsor_themes_status_notify_v2 ON sponsor_themes;
CREATE TRIGGER trg_sponsor_themes_status_notify_v2
AFTER INSERT OR UPDATE ON sponsor_themes
FOR EACH ROW EXECUTE FUNCTION public.notify_sponsor_theme_status_change_v2();


-- ========================================
-- 既存データの移行（sponsor_theme_notifications → sponsor_notifications）
-- ========================================

INSERT INTO sponsor_notifications (id, sponsor_id, type, title, message, is_read, sponsor_theme_id, created_at)
SELECT
  id,
  sponsor_id,
  CASE status
    WHEN 'approved' THEN 'theme_approved'
    WHEN 'rejected' THEN 'theme_rejected'
    WHEN 'published' THEN 'theme_published'
  END AS type,
  title,
  message,
  is_read,
  sponsor_theme_id,
  created_at
FROM sponsor_theme_notifications
ON CONFLICT (id) DO NOTHING;


-- ========================================
-- 旧トリガーを無効化（テーブルは残す）
-- ========================================
DROP TRIGGER IF EXISTS trg_sponsor_themes_status_notify ON sponsor_themes;
