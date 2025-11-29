-- ローカル開発用: Supabase auth スキーマのスタブ
-- auth.uid() 関数をエミュレートするためのダミー実装

-- authスキーマ作成
CREATE SCHEMA IF NOT EXISTS auth;

-- セッションからユーザーIDを取得するダミー関数
-- ローカル環境ではRLSをバイパスするため、NULLを返す
CREATE OR REPLACE FUNCTION auth.uid()
RETURNS UUID AS $$
BEGIN
    -- ローカル環境では常にNULLを返す（RLSはバイパスされる）
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- auth.role()のスタブ
CREATE OR REPLACE FUNCTION auth.role()
RETURNS TEXT AS $$
BEGIN
    RETURN 'authenticated';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- auth.jwt()のスタブ
CREATE OR REPLACE FUNCTION auth.jwt()
RETURNS JSONB AS $$
BEGIN
    RETURN '{}'::JSONB;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
