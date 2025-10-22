# 外部サービスのセットアップガイド

デプロイに必要な外部サービス（Redis、OpenAI）のセットアップ手順です。

## 1. Upstash Redis のセットアップ

Upstashは無料プランで始められるサーバーレスRedisサービスです。

### 手順:

1. **Upstashアカウント作成**
   - https://upstash.com/ にアクセス
   - 「Sign Up」をクリック
   - GitHubアカウントまたはメールアドレスで登録

2. **Redisデータベース作成**
   - ダッシュボードで「Create Database」をクリック
   - 名前: `yomibiyori-redis` (任意)
   - Type: **Regional** を選択（Globalより低レイテンシー）
   - Region: **Tokyo (ap-northeast-1)** を選択（日本リージョン）
   - 「Create」をクリック

3. **接続情報の取得**
   - 作成したデータベースをクリック
   - 「REST API」タブではなく「Details」タブを確認
   - **「Connect」**ボタンをクリック
   - **Redis**タブを選択（RESTではない）
   - `UPSTASH_REDIS_REST_URL` ではなく、`redis://...` で始まるURLをコピー

   例: `redis://default:YOUR_PASSWORD@us1-example-12345.upstash.io:6379`

4. **環境変数に設定**
   ```bash
   railway variables set REDIS_URL="redis://default:YOUR_PASSWORD@YOUR_HOST:6379"
   ```

### 無料プランの制限:
- 10,000 コマンド/日
- 256 MB データ
- このアプリケーションの使用には十分です

---

## 2. OpenAI API キーの取得

テーマ生成にOpenAI API (GPT-4o-mini) を使用します。

### 手順:

1. **OpenAIアカウント作成**
   - https://platform.openai.com/ にアクセス
   - 「Sign Up」をクリック
   - メールアドレスで登録

2. **支払い方法の設定**
   - Dashboard → Settings → Billing
   - 「Add payment method」をクリック
   - クレジットカード情報を入力
   - 初回$5-10程度チャージ推奨

3. **APIキーの作成**
   - Dashboard → API Keys
   - 「Create new secret key」をクリック
   - 名前: `yomibiyori` (任意)
   - Permissions: **All** または **Write**
   - 「Create secret key」をクリック
   - **表示されたキーを必ずコピー**（再表示不可）

   形式: `sk-proj-...` で始まる文字列

4. **環境変数に設定**
   ```bash
   railway variables set OPENAI_API_KEY="sk-proj-YOUR_API_KEY_HERE"
   ```

### 使用量の目安:
- テーマ生成: 1回あたり約$0.001-0.002 (GPT-4o-mini使用)
- 1日1回生成: 月間約$0.03-0.06
- 非常に低コストです

---

## 3. Railway 環境変数の設定

すべてのサービスのセットアップが完了したら、以下のコマンドで環境変数を設定します。

### Supabase (既にセットアップ済み)

```bash
# .env ファイルから値を確認して設定
railway variables set SUPABASE_URL="https://YOUR_PROJECT_REF.supabase.co"
railway variables set SUPABASE_PROJECT_REF="YOUR_PROJECT_REF"
railway variables set SUPABASE_JWKS_URL="https://YOUR_PROJECT_REF.supabase.co/auth/v1/keys"
railway variables set SUPABASE_JWT_SECRET="YOUR_JWT_SECRET"
railway variables set DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@db.YOUR_PROJECT_REF.supabase.co:5432/postgres"
```

### Upstash Redis (新規セットアップ)

```bash
railway variables set REDIS_URL="redis://default:YOUR_PASSWORD@YOUR_HOST:6379"
```

### OpenAI (新規セットアップ)

```bash
railway variables set OPENAI_API_KEY="sk-proj-YOUR_API_KEY"
```

### アプリケーション設定

```bash
railway variables set APP_TIMEZONE="Asia/Tokyo"
railway variables set THEME_CATEGORIES="general,nature,emotion,season,event"
railway variables set DEBUG="false"
railway variables set APP_ENV="production"
```

---

## 4. 環境変数の確認

設定後、以下のコマンドで確認:

```bash
railway variables
```

必須の環境変数がすべて設定されていることを確認してください:
- ✅ SUPABASE_URL
- ✅ SUPABASE_PROJECT_REF
- ✅ SUPABASE_JWKS_URL
- ✅ SUPABASE_JWT_SECRET
- ✅ DATABASE_URL
- ✅ REDIS_URL
- ✅ OPENAI_API_KEY
- ✅ APP_TIMEZONE
- ✅ THEME_CATEGORIES
- ✅ DEBUG
- ✅ APP_ENV

---

## 5. デプロイ

環境変数の設定が完了したら:

```bash
railway up
```

---

## トラブルシューティング

### Redisに接続できない
- URLが `redis://` で始まることを確認（`https://` ではない）
- Upstashダッシュボードで「REST API」ではなく「Redis」接続情報を使用

### OpenAI APIエラー
- APIキーが正しいことを確認
- Billing設定で支払い方法が登録されていることを確認
- API Limitを超えていないか確認

### Supabase接続エラー
- DATABASE_URLのフォーマットを確認
- Supabaseプロジェクトが起動していることを確認

---

## 次のステップ

1. ✅ Supabase セットアップ済み
2. 🔄 Upstash Redis セットアップ
3. 🔄 OpenAI APIキー取得
4. ⏭️ Railway環境変数設定
5. ⏭️ デプロイ実行
