# GitHub Actions Secrets チェックリスト

## 必須
| Secret | 用途 | 参照ワークフロー |
| ------ | ---- | ---------------- |
| `DATABASE_URL` | Supabase Postgres への接続 | generate_themes / finalize_rankings |
| `REDIS_URL` | Redis 接続 URL | finalize_rankings |
| `ANTHROPIC_API_KEY` | Claude (Anthropic) テーマ生成 | generate_themes |
| `THEME_CATEGORIES` | 生成対象カテゴリ（例: `恋愛,季節,日常,ユーモア`） | generate_themes |
| `SUPABASE_PROJECT_REF` | Supabase プロジェクト ID | generate_themes / finalize_rankings |
| `SUPABASE_SERVICE_ROLE_KEY` | ランキング確定ジョブ等の特権操作 | finalize_rankings |

## 任意 / 将来
| Secret | 用途 |
| ------ | ---- |
| `SUPABASE_URL` | Supabase REST エンドポイント（デフォルト値と異なる場合） |
| `APP_TIMEZONE` | タイムゾーン変更が必要な場合に設定 |
| `EXPO_ACCESS_TOKEN` | 06:00 通知ジョブ（実装予定）で利用 |

## 設定方法
1. GitHub リポジトリ → **Settings** → **Secrets and variables** → **Actions**。  
2. `New repository secret` を選び、キーと値を登録。  
3. `generate_themes.yml` と `finalize_rankings.yml` は Secrets を直接使用するため、登録後すぐに `workflow_dispatch` でテスト実行可能。
