# スポンサー機能マイグレーション実行ガイド

## 📋 概要

このガイドは、スポンサー機能を追加するためのデータベースマイグレーション（`20250101_01_add_sponsor_features.py`）を実行する手順を説明します。

---

## 🚨 事前準備

### 1. バックアップの取得

**重要**: マイグレーション実行前に、必ずデータベースのバックアップを取得してください。

```bash
# PostgreSQLのバックアップコマンド例
pg_dump -h <host> -U <user> -d <database> > backup_$(date +%Y%m%d_%H%M%S).sql
```

または、Supabase/Neonのダッシュボードからバックアップを作成してください。

### 2. 環境変数の確認

以下の環境変数が正しく設定されていることを確認してください：

- `DATABASE_URL`: PostgreSQLの接続URL

**確認方法**:
```bash
# ローカル
grep DATABASE_URL .env

# Railway
railway variables
```

---

## 🔧 マイグレーション実行方法

### 方法1: Railway上で実行（推奨）

Railway上でマイグレーションを実行する方法です。

#### ステップ1: Railwayにログイン

```bash
railway login
```

#### ステップ2: プロジェクトにリンク

```bash
railway link
```

プロジェクト名とサービスを選択してください。

#### ステップ3: マイグレーションを実行

```bash
railway run --service yomibiyori alembic upgrade head
```

または、特定の環境を指定する場合：

```bash
railway run --service yomibiyori --environment production alembic upgrade head
```

---

### 方法2: ローカルから実行

ローカル環境からRailway/本番のデータベースに対してマイグレーションを実行する方法です。

#### ステップ1: 環境変数を設定

```bash
# .env ファイルに DATABASE_URL を設定
# または環境変数として設定
export DATABASE_URL="postgresql://user:password@host:port/database"
```

#### ステップ2: マイグレーションを実行

```bash
alembic upgrade head
```

---

### 方法3: GitHub Actionsで実行（自動化）

GitHub Actionsを使って自動でマイグレーションを実行する方法です。

#### ワークフローファイルの作成

`.github/workflows/run_migration.yml` を作成：

```yaml
name: Run Database Migration

on:
  workflow_dispatch:
    inputs:
      migration_version:
        description: 'Migration version (default: head)'
        required: false
        default: 'head'

jobs:
  migrate:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'

      - name: Install dependencies
        run: |
          pip install -r requirements.txt

      - name: Run Alembic migration
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
        run: |
          alembic upgrade ${{ github.event.inputs.migration_version }}

      - name: Notify on success
        if: success()
        run: echo "Migration completed successfully!"
```

#### GitHub Secretsの設定

1. GitHubリポジトリの **Settings** → **Secrets and variables** → **Actions** に移動
2. **New repository secret** をクリック
3. `DATABASE_URL` を追加（Railwayから取得したDATABASE_URLを設定）

#### ワークフローの実行

1. GitHub リポジトリの **Actions** タブに移動
2. **Run Database Migration** ワークフローを選択
3. **Run workflow** をクリック
4. マイグレーションバージョンを指定（デフォルトは `head`）
5. **Run workflow** ボタンをクリックして実行

---

## ✅ マイグレーション確認

マイグレーションが正常に完了したか確認します。

### 1. Alembicのバージョン確認

```bash
alembic current
```

出力例：
```
20250101_01 (head)
```

### 2. データベース接続して確認

```bash
# psqlで接続
psql $DATABASE_URL

# テーブルの存在確認
\dt

# sponsor_campaigns テーブルの確認
\d sponsor_campaigns

# sponsor_themes テーブルの確認
\d sponsor_themes

# users テーブルの role カラム確認
\d users
```

### 3. 新しいテーブルが作成されているか確認

以下のテーブルが作成されていることを確認：

- ✅ `sponsor_campaigns`
- ✅ `sponsor_themes`
- ✅ `users.role` カラムが追加されている
- ✅ `themes.sponsor_theme_id` カラムが追加されている
- ✅ `themes.sponsor_company_name` カラムが追加されている

---

## 🔄 ロールバック（元に戻す）

問題が発生した場合、以下のコマンドでマイグレーションを元に戻すことができます：

```bash
# 1つ前のバージョンに戻す
alembic downgrade -1

# 特定のバージョンに戻す
alembic downgrade 20251020_01
```

---

## 🚀 マイグレーション後の作業

### 1. ユーザーロールの設定

管理者やスポンサーのロールを手動で設定する必要があります。

```sql
-- 管理者ロールを設定
UPDATE users SET role = 'admin' WHERE email = 'admin@example.com';

-- スポンサーロールを設定
UPDATE users SET role = 'sponsor' WHERE email = 'sponsor@example.com';
```

### 2. アプリケーションの再起動

Railwayの場合、自動的に再起動されます。
ローカルの場合は、アプリケーションを再起動してください。

```bash
# アプリケーションを再起動
uvicorn app.main:app --reload
```

### 3. APIドキュメントの確認

ブラウザで以下のURLにアクセスして、新しいAPIエンドポイントが表示されることを確認：

```
http://localhost:8000/docs
```

新しいエンドポイント：
- `/sponsor/campaigns` (POST, GET)
- `/sponsor/themes` (POST, GET)
- `/admin/review/themes` (GET)
- `/admin/review/themes/{id}/approve` (POST)
- `/admin/review/themes/{id}/reject` (POST)

---

## 🐛 トラブルシューティング

### エラー: "Could not parse SQLAlchemy URL"

**原因**: DATABASE_URLが設定されていない、または不正なフォーマット

**解決方法**:
```bash
# DATABASE_URLを確認
echo $DATABASE_URL

# .envファイルを確認
cat .env | grep DATABASE_URL

# 正しいフォーマット例
DATABASE_URL=postgresql://user:password@host:port/database
```

### エラー: "Target database is not up to date"

**原因**: データベースのバージョンがコードと一致していない

**解決方法**:
```bash
# 現在のバージョンを確認
alembic current

# 最新バージョンにアップグレード
alembic upgrade head
```

### エラー: "Multiple services found"

**原因**: Railwayに複数のサービスが存在する

**解決方法**:
```bash
# サービスを明示的に指定
railway run --service yomibiyori alembic upgrade head
```

### エラー: "relation already exists"

**原因**: テーブルが既に存在している

**解決方法**:
```bash
# マイグレーション履歴を確認
alembic history

# データベースの現在のバージョンを確認
alembic current

# 必要に応じてマイグレーションをスタンプ
alembic stamp head
```

---

## 📞 サポート

問題が解決しない場合は、以下の情報を含めてissueを作成してください：

1. エラーメッセージ全文
2. 実行したコマンド
3. 環境（ローカル / Railway / 本番）
4. Alembicのバージョン (`alembic --version`)
5. PostgreSQLのバージョン

---

## 📚 参考資料

- [Alembic Documentation](https://alembic.sqlalchemy.org/)
- [Railway Documentation](https://docs.railway.app/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
