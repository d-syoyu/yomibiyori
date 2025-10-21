# 詠日和（Yomibiyori）

詠日和は、AI が提案する「上の句」とユーザーが詠む「下の句」を組み合わせ、作品を共有するポエティック SNS プロジェクトです。FastAPI / SQLAlchemy を中心としたバックエンドと、React Native + Expo を想定したフロントエンドで構成されています。

## 主な機能
- Supabase Auth を用いた JWT 認証とプロフィール同期
- 日替わりお題（テーマ）に対する 1 日 1 首の投稿機能
- いいね／インプレッションを考慮したリアルタイムランキング
- Redis を利用したランキングメトリクスの集計と 22:00 のスナップショット確定
- Sentry・PostHog を想定したモニタリング／分析

詳細な仕様は `REQUIREMENTS.md`、API 定義は `OPENAPI.yaml`、DB スキーマは `SCHEMA.sql` を参照してください。

## リポジトリ構成
```
app/
  core/       # 設定・Redis ファクトリなど
  db/         # SQLAlchemy セッション管理・Base
  models/     # ORM モデル定義
  routes/     # FastAPI ルータ（auth / works / ranking）
  schemas/    # Pydantic スキーマ
  services/   # ドメインロジック
tests/        # Pytest テストスイート
alembic/      # マイグレーション（未実装の場合は雛形）
OPENAPI.yaml  # REST API 仕様
SCHEMA.sql    # PostgreSQL DDL / RLS ポリシー
```

## 必要環境
- Python 3.11
- Node.js 20（React Native アプリ開発用）
- Redis（ローカルまたはマネージドサービス）
- PostgreSQL 14 以降（ローカル開発では SQLite でも可）
- Poetry または `venv` + `pip`（本リポジトリは `pyproject.toml` の標準パッケージ管理を想定）

## セットアップ
1. 仮想環境の作成と依存関係のインストール
   ```bash
   python -m venv venv
   source venv/bin/activate  # Windows の場合: .\venv\Scripts\activate
   pip install -U pip
   pip install -e .[dev]
   ```

2. 環境変数の設定  
   `env.example` を参考に `.env` を作成し、DB・Redis・Supabase の接続情報を記入してください。

3. 開発サーバーの起動
   ```bash
    uvicorn app.main:app --reload
   ```
   `http://localhost:8000/docs` で自動生成された API ドキュメントを確認できます。

## テスト
Pytest によるユニット／API テストを用意しています。
```bash
pytest
```

## データベース
- SQLAlchemy のモデルは `app/models` 以下にあり、テストでは SQLite、実運用では PostgreSQL を想定しています。
- RLS を含む正式なスキーマは `SCHEMA.sql` を参照してください。
- マイグレーションは Alembic を利用する想定です（`alembic.ini` を同梱）。

## よくある操作
- Black / Ruff などのフォーマッタは未同梱のため、必要に応じて追加してください。
- Redis との接続をテストする場合は fakeredis を利用しており、テストスイート内のフィクスチャで自動的に差し替わります。
- 認証系テストでは Supabase の外部通信をモックしています。実機連携時は `.env` に適切なキーを設定してください。

## 参考ドキュメント
- `AGENTS.md`: エージェントの人格・優先順位・コーディング規約
- `codex.yaml`: Codex CLI 用設定
- `OPENAPI.yaml`: API 仕様（OpenAPI 3.1）
- `SCHEMA.sql`: PostgreSQL DDL と RLS ポリシー

## ライセンス
ライセンスは未設定です。公開・配布時は適切なライセンスを追記してください。
