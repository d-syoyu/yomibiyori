# CI/CD とスケジューリング方針メモ

## 目的
- テストと型チェックの自動化
- 日次ジョブ（お題生成・ランキング確定）のスケジューリング戦略を整理
- Secrets / 環境変数の取り扱いルールを明文化

## CI (GitHub Actions)
1. **ワークフロー構成**
   - `ci.yml` (push / PR トリガ):  
     - `setup-python` で Python 3.11 をインストール  
     - 依存関係: `pip install -e .[dev]`  
     - `pytest`、将来的には `ruff` / `black --check` などスタイルチェック  
   - Node/Expo 側のチェックが必要になったら別ワークフローに分離
2. **キャッシュ**
   - `actions/cache` で `pip` キャッシュを利用
3. **秘密情報**
   - Supabase / Redis / OpenAI など外部キーは Actions Secret に登録  
   - テストでは fakeredis を使用するため、CI では実 Redis へは接続しない

## CD (将来構想)
- main ブランチへマージ後、GitHub Actions から Railway などの常駐環境へデプロイを自動化
- `infra` ブランチなどで IaC 管理を進めることも検討

## スケジューリング
1. **お題生成 (21:00 JST)**  
   - GitHub Actions の `generate_themes.yml`（cron: `0 12 * * *`）で `scripts/generate_themes.py` を実行。  
   - Secrets に `DATABASE_URL` / `OPENAI_API_KEY` / `THEME_CATEGORIES` / `SUPABASE_PROJECT_REF` を設定すること。
2. **ランキング確定 (22:00 JST)**  
   - `finalize_rankings.yml`（cron: `0 13 * * *`）で `scripts/finalize_rankings.py` を実行。  
   - Secrets として `DATABASE_URL` / `REDIS_URL` / `SUPABASE_PROJECT_REF` が必要。
3. **06:00 通知配信 (未実装)**  
   - Expo Push 用の Queue へ連携するジョブを追加予定。Actions もしくは Railway Scheduler での実装を検討。

## Secrets 管理
- GitHub Actions: `DATABASE_URL`, `REDIS_URL`, `OPENAI_API_KEY`, `THEME_CATEGORIES`, `SUPABASE_PROJECT_REF`, `SUPABASE_SERVICE_ROLE_KEY`
- Railway: プロジェクト環境変数に追加し、`railway run` から参照

## 今後の TODO
- `scripts/` ディレクトリに CLI を整備し、ジョブ実行を簡素化
- GitHub Actions のスケジュールトリガ (`cron`) でフェイルセーフ実行を検討
- 各ジョブの健全性を監視する Health Check エンドポイントを FastAPI 側へ追加
