-- スポンサーログイン時のRLSポリシー修正

-- 既存のポリシーを削除（存在する場合）
DROP POLICY IF EXISTS "Users can read their own data" ON users;

-- ユーザーが自分のデータを読み取れるポリシーを作成
CREATE POLICY "Users can read their own data"
ON users
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- 確認クエリ
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'users'
ORDER BY policyname;
