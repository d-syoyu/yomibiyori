-- スポンサーテーブルのRLSポリシーを追加
-- スポンサーお題作成ページで発生している406/403エラーを修正

-- 既存の古いサービスロールのみのポリシーを削除
DROP POLICY IF EXISTS write_service_sponsors ON sponsors;

-- Supabase auth.uid()を使った新しいポリシーを追加
-- (read_sponsorsポリシーは既存のため変更不要)

-- スポンサーが自分のレコードを作成できるポリシー
CREATE POLICY IF NOT EXISTS insert_own_sponsor ON sponsors
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- スポンサーが自分のレコードを更新できるポリシー
CREATE POLICY IF NOT EXISTS update_own_sponsor ON sponsors
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- RLSが有効化されているか確認
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'sponsors';

-- ポリシーの確認
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'sponsors'
ORDER BY policyname;
