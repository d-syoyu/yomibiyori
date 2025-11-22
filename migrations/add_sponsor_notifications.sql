-- スポンサーお題ステータス変更通知トリガ
CREATE OR REPLACE FUNCTION public.notify_sponsor_theme_status_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_sponsor_id uuid;
  v_title text;
  v_message text;
BEGIN
  -- ステータスが変更された場合のみ処理
  IF (TG_OP = 'UPDATE' and old.status = new.status) THEN
    RETURN new;
  END IF;

  -- approved, rejected, published の場合のみ通知
  IF new.status NOT IN ('approved', 'rejected', 'published') THEN
    RETURN new;
  END IF;

  -- スポンサーIDを取得（campaign経由）
  SELECT sc.sponsor_id INTO v_sponsor_id
  FROM sponsor_campaigns sc
  WHERE sc.id = new.campaign_id;

  IF v_sponsor_id IS NULL THEN
    RETURN new;
  END IF;

  -- 通知メッセージを生成
  CASE new.status
    WHEN 'approved' THEN
      v_title := 'お題が承認されました';
      v_message := 'お題「' || new.text_575 || '」が審査を通過し、承認されました。配信日: ' || to_char(new.date, 'YYYY年MM月DD日');
    WHEN 'rejected' THEN
      v_title := 'お題が却下されました';
      IF new.rejection_reason IS NOT NULL AND new.rejection_reason != '' THEN
        v_message := 'お題「' || new.text_575 || '」は審査の結果、却下されました。理由: ' || new.rejection_reason;
      ELSE
        v_message := 'お題「' || new.text_575 || '」は審査の結果、却下されました。';
      END IF;
    WHEN 'published' THEN
      v_title := 'お題が配信されました';
      v_message := 'お題「' || new.text_575 || '」が配信されました。ユーザーの反応をインサイトページでご確認いただけます。';
  END CASE;

  -- 通知を作成
  INSERT INTO sponsor_theme_notifications (
    sponsor_theme_id,
    sponsor_id,
    status,
    title,
    message
  ) VALUES (
    new.id,
    v_sponsor_id,
    new.status,
    v_title,
    v_message
  );

  RETURN new;
END;
$$;

-- ========= スポンサーお題ステータス通知 =========
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

CREATE INDEX IF NOT EXISTS idx_sponsor_theme_notifications_sponsor ON sponsor_theme_notifications(sponsor_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sponsor_theme_notifications_theme ON sponsor_theme_notifications(sponsor_theme_id);

COMMENT ON TABLE sponsor_theme_notifications IS 'スポンサーお題のステータス変更通知';
COMMENT ON COLUMN sponsor_theme_notifications.status IS '変更後のステータス: approved / rejected / published';
COMMENT ON COLUMN sponsor_theme_notifications.is_read IS '既読フラグ';

-- ========= スポンサーお知らせ =========
CREATE TABLE IF NOT EXISTS sponsor_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (length(title) BETWEEN 1 AND 200),
  content text NOT NULL CHECK (length(content) BETWEEN 1 AND 2000),
  type text NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'warning', 'success', 'update')),
  priority integer NOT NULL DEFAULT 0,
  is_pinned boolean NOT NULL DEFAULT false,
  is_published boolean NOT NULL DEFAULT true,
  expires_at timestamptz,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_sponsor_announcements_updated_at
BEFORE UPDATE ON sponsor_announcements
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_sponsor_announcements_published ON sponsor_announcements(is_published, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sponsor_announcements_pinned ON sponsor_announcements(is_pinned) WHERE is_pinned = true;

COMMENT ON TABLE sponsor_announcements IS 'スポンサー向けお知らせ（管理者が作成）';
COMMENT ON COLUMN sponsor_announcements.type IS 'お知らせタイプ: info / warning / success / update';
COMMENT ON COLUMN sponsor_announcements.priority IS '表示優先度（高いほど上位表示）';
COMMENT ON COLUMN sponsor_announcements.is_pinned IS 'ピン留めフラグ（常に上部に表示）';
COMMENT ON COLUMN sponsor_announcements.expires_at IS '有効期限（nullの場合は無期限）';

-- RLS設定
ALTER TABLE sponsor_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE sponsor_theme_notifications ENABLE ROW LEVEL SECURITY;

-- sponsor_announcements: 公開中のお知らせを全員が閲覧可能
DROP POLICY IF EXISTS read_sponsor_announcements ON sponsor_announcements;
CREATE POLICY read_sponsor_announcements ON sponsor_announcements
  FOR SELECT USING (
    is_published = true
    AND (expires_at IS NULL OR expires_at > now())
  );

-- sponsor_announcements: 管理者のみ作成・更新・削除可能
DROP POLICY IF EXISTS write_admin_announcements ON sponsor_announcements;
CREATE POLICY write_admin_announcements ON sponsor_announcements
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- sponsor_theme_notifications: 自分宛の通知のみ閲覧可能
DROP POLICY IF EXISTS read_own_theme_notifications ON sponsor_theme_notifications;
CREATE POLICY read_own_theme_notifications ON sponsor_theme_notifications
  FOR SELECT
  USING (sponsor_id = auth.uid());

-- sponsor_theme_notifications: 自分の通知のみ更新可能（既読状態など）
DROP POLICY IF EXISTS update_own_theme_notifications ON sponsor_theme_notifications;
CREATE POLICY update_own_theme_notifications ON sponsor_theme_notifications
  FOR UPDATE
  USING (sponsor_id = auth.uid())
  WITH CHECK (sponsor_id = auth.uid());

-- sponsor_theme_notifications: システムと管理者のみ作成可能
DROP POLICY IF EXISTS insert_theme_notifications ON sponsor_theme_notifications;
CREATE POLICY insert_theme_notifications ON sponsor_theme_notifications
  FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- トリガーを sponsor_themes に適用
DROP TRIGGER IF EXISTS trg_sponsor_themes_status_notify ON sponsor_themes;
CREATE TRIGGER trg_sponsor_themes_status_notify
AFTER INSERT OR UPDATE ON sponsor_themes
FOR EACH ROW EXECUTE FUNCTION public.notify_sponsor_theme_status_change();
