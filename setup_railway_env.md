# Railway 環境変数設定ガイド

## 必須環境変数

デプロイ前に以下の環境変数を設定する必要があります。

### 1. Supabase関連

**Supabase Dashboard → Settings → API から取得:**

```bash
# SUPABASE_URL
railway variables set SUPABASE_URL="https://YOUR_PROJECT_REF.supabase.co"

# SUPABASE_PROJECT_REF (URLの最初の部分)
railway variables set SUPABASE_PROJECT_REF="YOUR_PROJECT_REF"

# SUPABASE_JWKS_URL
railway variables set SUPABASE_JWKS_URL="https://YOUR_PROJECT_REF.supabase.co/auth/v1/keys"

# SUPABASE_JWT_SECRET
railway variables set SUPABASE_JWT_SECRET="YOUR_JWT_SECRET_FROM_SUPABASE"
```

**Supabase Dashboard → Settings → Database → Connection string:**

```bash
# DATABASE_URL (PostgreSQL接続文字列)
railway variables set DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@db.YOUR_PROJECT_REF.supabase.co:5432/postgres"
```

**オプション: サービスロールキー (ランキング確定ジョブ用):**

```bash
railway variables set SUPABASE_SERVICE_ROLE_KEY="YOUR_SERVICE_ROLE_KEY"
```

### 2. Redis関連

**Upstash Console → Redis → Database → Connect から取得:**

```bash
# REDIS_URL
railway variables set REDIS_URL="redis://default:YOUR_PASSWORD@YOUR_REDIS_HOST:PORT"
```

### 3. OpenAI関連

**OpenAI Platform → API Keys から取得:**

```bash
# OPENAI_API_KEY (テーマ生成に必須)
railway variables set OPENAI_API_KEY="sk-proj-YOUR_API_KEY"
```

### 4. アプリケーション設定

```bash
# タイムゾーン (日本時間)
railway variables set APP_TIMEZONE="Asia/Tokyo"

# テーマカテゴリ (カンマ区切り)
railway variables set THEME_CATEGORIES="general,nature,emotion,season,event"

# デバッグモード (本番ではfalse)
railway variables set DEBUG="false"

# 環境ラベル
railway variables set APP_ENV="production"
```

## オプション環境変数

以下はオプションですが、設定することで機能が有効になります:

```bash
# Cloudflare R2 (画像アップロード用 - 将来的に使用)
railway variables set R2_ACCOUNT_ID="YOUR_R2_ACCOUNT_ID"
railway variables set R2_ACCESS_KEY_ID="YOUR_R2_ACCESS_KEY"
railway variables set R2_SECRET_ACCESS_KEY="YOUR_R2_SECRET_KEY"

# Expo (プッシュ通知用 - 将来的に使用)
railway variables set EXPO_ACCESS_TOKEN="YOUR_EXPO_TOKEN"

# Sentry (エラートラッキング)
railway variables set SENTRY_DSN="YOUR_SENTRY_DSN"

# PostHog (アナリティクス)
railway variables set POSTHOG_API_KEY="YOUR_POSTHOG_KEY"
```

## 環境変数の確認

設定後、以下のコマンドで確認できます:

```bash
railway variables
```

## 一括設定用テンプレート

以下は一括設定用のテンプレートです。値を置き換えて一つずつ実行してください:

```bash
# === 必須: Supabase ===
railway variables set SUPABASE_URL=""
railway variables set SUPABASE_PROJECT_REF=""
railway variables set SUPABASE_JWKS_URL=""
railway variables set SUPABASE_JWT_SECRET=""
railway variables set DATABASE_URL=""

# === 必須: Redis ===
railway variables set REDIS_URL=""

# === 必須: OpenAI ===
railway variables set OPENAI_API_KEY=""

# === 必須: アプリケーション設定 ===
railway variables set APP_TIMEZONE="Asia/Tokyo"
railway variables set THEME_CATEGORIES="general,nature,emotion,season,event"
railway variables set DEBUG="false"
railway variables set APP_ENV="production"

# === オプション: サービスロールキー ===
# railway variables set SUPABASE_SERVICE_ROLE_KEY=""
```

## 次のステップ

環境変数の設定が完了したら:

1. `railway up` でデプロイ
2. `railway logs` でログ確認
3. `railway open` でアプリケーションを開く
