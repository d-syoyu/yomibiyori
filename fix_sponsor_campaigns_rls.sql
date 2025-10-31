-- sponsor_campaignsとsponsor_themesのRLSポリシーを修正
-- 403 Forbiddenエラーを解決するため、auth.uid()を使用するポリシーに変更

-- ========= sponsor_campaigns =========

-- 既存のポリシーを削除
DROP POLICY IF EXISTS insert_own_campaign ON sponsor_campaigns;
DROP POLICY IF EXISTS update_own_campaign ON sponsor_campaigns;
DROP POLICY IF EXISTS delete_own_campaign ON sponsor_campaigns;

-- スポンサーが自分のキャンペーンを作成できるポリシー
CREATE POLICY insert_own_campaign ON sponsor_campaigns
FOR INSERT
TO authenticated
WITH CHECK (
  sponsor_id = auth.uid()
  OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- スポンサーが自分のキャンペーンを更新できるポリシー
CREATE POLICY update_own_campaign ON sponsor_campaigns
FOR UPDATE
TO authenticated
USING (
  sponsor_id = auth.uid()
  OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
)
WITH CHECK (
  sponsor_id = auth.uid()
  OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- スポンサーが自分のキャンペーンを削除できるポリシー
CREATE POLICY delete_own_campaign ON sponsor_campaigns
FOR DELETE
TO authenticated
USING (
  sponsor_id = auth.uid()
  OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- ========= sponsor_themes =========

-- 既存のポリシーを削除
DROP POLICY IF EXISTS insert_own_sponsor_theme ON sponsor_themes;
DROP POLICY IF EXISTS update_own_sponsor_theme ON sponsor_themes;
DROP POLICY IF EXISTS delete_own_sponsor_theme ON sponsor_themes;

-- スポンサーが自分のキャンペーンのお題を作成できるポリシー
CREATE POLICY insert_own_sponsor_theme ON sponsor_themes
FOR INSERT
TO authenticated
WITH CHECK (
  campaign_id IN (
    SELECT id FROM sponsor_campaigns WHERE sponsor_id = auth.uid()
  )
  OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- スポンサーが自分のキャンペーンのお題を更新できるポリシー
CREATE POLICY update_own_sponsor_theme ON sponsor_themes
FOR UPDATE
TO authenticated
USING (
  campaign_id IN (
    SELECT id FROM sponsor_campaigns WHERE sponsor_id = auth.uid()
  )
  OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
)
WITH CHECK (
  campaign_id IN (
    SELECT id FROM sponsor_campaigns WHERE sponsor_id = auth.uid()
  )
  OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- スポンサーが自分のキャンペーンのお題を削除できるポリシー
CREATE POLICY delete_own_sponsor_theme ON sponsor_themes
FOR DELETE
TO authenticated
USING (
  campaign_id IN (
    SELECT id FROM sponsor_campaigns WHERE sponsor_id = auth.uid()
  )
  OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- 確認クエリ
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename IN ('sponsors', 'sponsor_campaigns', 'sponsor_themes')
ORDER BY tablename, policyname;
