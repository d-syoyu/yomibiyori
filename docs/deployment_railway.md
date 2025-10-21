# Railway へのデプロイ手順

## 事前準備
- Railway アカウントを作成し、プロジェクトを 1 つ用意する。
- Supabase（Auth / Postgres）、Redis（Upstash など）、OpenAI アカウントを準備し、各種接続情報を確認する。
- GitHub リポジトリに最新コードを push しておく。

## 1. サービス作成
1. Railway ダッシュボードで **New Project → Deploy from GitHub repo** を選択。
2. リポジトリ `yomibiyori` を選び、`main` ブランチを指定。
3. `Start Command` は自動検出されるが、`Procfile` があるのでそのままで OK。

## 2. 環境変数の設定
Railway の「Variables」に以下を登録する。

| Key | 説明 |
| --- | ---- |
| `DATABASE_URL` | Supabase Postgres 接続文字列（`postgres://...`） |
| `REDIS_URL` | Redis 接続 URL（Upstash など） |
| `OPENAI_API_KEY` | OpenAI API キー |
| `THEME_CATEGORIES` | カンマ区切りカテゴリ例：`general,nature,emotion` |
| `SUPABASE_PROJECT_REF` | Supabase プロジェクトリファレンス（`xxxxxx`） |
| `SUPABASE_URL` | Supabase REST エンドポイント (`https://<ref>.supabase.co`) |
| `SUPABASE_JWT_SECRET` | ローカル検証用シークレット（必要に応じて） |
| `SUPABASE_JWKS_URL` | `https://<ref>.supabase.co/auth/v1/keys` |
| `SUPABASE_SERVICE_ROLE_KEY` | サービスロールキー（ランキング確定ジョブなどが必要な場合） |
| `APP_TIMEZONE` | `Asia/Tokyo` や任意のタイムゾーン |
| `DEBUG` | `false` (本番では無効にする) |

※ 本番用に `.env` をアップロードしないこと。Railway の Variables で管理する。

## 3. デプロイと確認
1. Variables 設定後、「Deployments」タブで再デプロイをトリガ。
2. `https://<project>.up.railway.app/api/v1/health` などヘルスエンドポイント（実装予定）で確認。
3. `uvicorn` のログを確認し、エラーがないことをチェック。

## 4. カスタムドメイン（任意）
1. Railway 設定で **Domains** を開き、`api.yomibiyori.app` 等のドメインを登録。
2. DNS プロバイダで CNAME レコードを指す。
3. SSL は Railway 側で自動発行される。

## 5. ジョブ連携
- `generate_themes.yml` / `finalize_rankings.yml` の GitHub Actions が参照する Secrets と Railway Variables を同期させる。
- 必要に応じて Railway Scheduler でバックアップジョブを設定する。

## 6. デバッグ Tips
- Railway Logs で `env` の値を出力しない（API キー流出防止）。
- `railway run python -m alembic ...` など CLI を使う場合、局所的に Variables を確実に設定した状態で実行する。
- 再デプロイが必要な場合は GitHub への push か Railway の「Redeploy」ボタンを利用。
