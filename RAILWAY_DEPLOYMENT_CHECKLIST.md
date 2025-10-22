# Railway デプロイチェックリスト

## 現在の状態
✅ コード実装完了 (Theme API追加)
✅ テスト通過 (37/37 tests passing)
✅ GitHub にプッシュ済み
✅ Railway CLI インストール済み

## 次のステップ

### 1. Railway ログイン
```bash
railway login
```
- ブラウザが開きRailwayのログイン画面が表示されます
- ログインすると自動的にCLIが認証されます

### 2. プロジェクト作成とリンク

**オプションA: 新規プロジェクト作成**
```bash
railway init
```
- プロジェクト名: `yomibiyori`
- GitHubリポジトリと連携

**オプションB: 既存プロジェクトをリンク**
```bash
railway link
```
- 既存のプロジェクトIDを選択

### 3. 環境変数の設定

以下のコマンドで環境変数を設定します：

```bash
# Supabase設定
railway variables set SUPABASE_URL="https://YOUR_PROJECT_REF.supabase.co"
railway variables set SUPABASE_PROJECT_REF="YOUR_PROJECT_REF"
railway variables set SUPABASE_JWT_SECRET="YOUR_JWT_SECRET"
railway variables set SUPABASE_JWKS_URL="https://YOUR_PROJECT_REF.supabase.co/auth/v1/keys"
railway variables set DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@db.YOUR_PROJECT_REF.supabase.co:5432/postgres"

# Redis設定 (Upstash推奨)
railway variables set REDIS_URL="redis://default:YOUR_PASSWORD@YOUR_REDIS_HOST:PORT"

# OpenAI設定
railway variables set OPENAI_API_KEY="sk-proj-..."

# アプリケーション設定
railway variables set THEME_CATEGORIES="general,nature,emotion,season,event"
railway variables set APP_TIMEZONE="Asia/Tokyo"
railway variables set DEBUG="false"

# オプション: サービスロールキー (管理操作用)
railway variables set SUPABASE_SERVICE_ROLE_KEY="YOUR_SERVICE_ROLE_KEY"
```

**重要な環境変数の取得方法:**

1. **Supabase変数**
   - Supabase Dashboard → Settings → API
   - `SUPABASE_URL`: Project URL
   - `SUPABASE_PROJECT_REF`: URLの最初の部分 (例: `abcdefgh` from `abcdefgh.supabase.co`)
   - `SUPABASE_JWT_SECRET`: JWT Secret
   - Database URL: Settings → Database → Connection string (URI)

2. **Redis (Upstash推奨)**
   - Upstash Console → Redis → Database → Connect
   - REDIS_URL をコピー

3. **OpenAI**
   - OpenAI Platform → API Keys
   - 新しいAPIキーを作成

### 4. デプロイ実行

```bash
# main ブランチからデプロイ
railway up
```

または、Railwayダッシュボードから：
1. 「Deployments」タブを開く
2. 「Deploy」ボタンをクリック
3. 自動的にGitHubの最新コミットがデプロイされます

### 5. デプロイ確認

```bash
# デプロイログを確認
railway logs

# アプリケーションを開く
railway open
```

**APIエンドポイントをテスト:**
```bash
# デプロイされたURLを取得
railway status

# ヘルスチェック (実装されている場合)
curl https://YOUR_APP.up.railway.app/

# Theme API テスト (認証不要)
curl https://YOUR_APP.up.railway.app/api/v1/themes/today
```

### 6. カスタムドメイン設定 (オプション)

```bash
railway domain
```

または、Railwayダッシュボード → Settings → Domains

### 7. GitHub Actions Secrets 設定

GitHub リポジトリ → Settings → Secrets and variables → Actions

以下のSecretsを追加:
- `RAILWAY_TOKEN`: Railway Dashboard → Account Settings → Tokens → Create Token
- `DATABASE_URL`: RailwayのDATABASE_URLと同じ
- `REDIS_URL`: RailwayのREDIS_URLと同じ
- `OPENAI_API_KEY`: RailwayのOPENAI_API_KEYと同じ
- `SUPABASE_URL`: RailwayのSUPABASE_URLと同じ
- `SUPABASE_SERVICE_ROLE_KEY`: Supabaseのservice role key

### 8. 本番環境での動作確認

```bash
# Themeが存在しない場合は404が返る (正常)
curl https://YOUR_APP.up.railway.app/api/v1/themes/today

# 認証テスト (有効なJWTトークンが必要)
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  https://YOUR_APP.up.railway.app/api/v1/auth/profile
```

## トラブルシューティング

### デプロイエラーの確認
```bash
railway logs --deployment
```

### 環境変数の確認
```bash
railway variables
```

### データベース接続エラー
- DATABASE_URLが正しいことを確認
- Supabase Postgres が起動していることを確認
- ファイアウォール設定でRailway IPを許可 (Supabaseは通常全てのIPを許可)

### Redis接続エラー
- REDIS_URLのフォーマットを確認
- Upstashダッシュボードで接続テスト

## 参考資料
- [Railway Documentation](https://docs.railway.app/)
- [Supabase Documentation](https://supabase.com/docs)
- プロジェクト内: `docs/deployment_railway.md`
