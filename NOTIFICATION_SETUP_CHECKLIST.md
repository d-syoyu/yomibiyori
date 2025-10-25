# 🔔 通知機能セットアップチェックリスト

詠日和の通知機能を本番環境で有効にするための設定チェックリストです。

---

## 📊 現在の設定状況

### ✅ 実装済み
- [x] バックエンドAPI実装
- [x] モバイルアプリ実装
- [x] データベーススキーマ
- [x] RLSポリシー
- [x] GitHub Actionsワークフロー
- [x] テストコード (8/8 passed)
- [x] パッケージインストール (expo-notifications)

### ⚠️ 設定が必要な項目

#### 1. **GitHub Secrets - 🚨 EXPO_ACCESS_TOKEN が未設定**

現在設定されているSecrets（28個）:
```
✅ DATABASE_URL
✅ REDIS_URL
✅ SUPABASE_PROJECT_REF
✅ SUPABASE_URL
✅ SUPABASE_JWT_SECRET
✅ SUPABASE_SERVICE_ROLE_KEY
... (その他25個)

❌ EXPO_ACCESS_TOKEN  ← 🚨 これが必要！
```

#### 2. **Railway環境変数**

Railwayバックエンドサービスに設定が必要な環境変数：
```
EXPO_ACCESS_TOKEN=your-expo-access-token
```

※ 他の環境変数は既に設定済みと想定

#### 3. **EAS Project ID（モバイルアプリ）**

`mobile/.env` ファイルに設定が必要：
```
EAS_PROJECT_ID=your-eas-project-id
```

---

## 🔧 設定手順

### Step 1: Expo Access Tokenの取得

1. https://expo.dev にログイン
2. アカウント設定 → Access Tokens
3. **Create Token** をクリック
4. Token名: `yomibiyori-push-notifications`
5. スコープ: **すべて選択**（または最低限 `publish` を選択）
6. トークンをコピー（**重要**: 一度しか表示されません）

### Step 2: GitHub Secretsに設定

```bash
# 方法1: コマンドライン
gh secret set EXPO_ACCESS_TOKEN
# プロンプトが表示されたら、コピーしたトークンを貼り付け

# 方法2: GitHub Web UI
# https://github.com/<your-username>/yomibiyori/settings/secrets/actions
# 「New repository secret」をクリック
# Name: EXPO_ACCESS_TOKEN
# Secret: <コピーしたトークン>
```

### Step 3: Railwayに環境変数を設定

#### 方法1: Railway Web UI（推奨）
1. https://railway.app にログイン
2. プロジェクト `yomibiyori` を選択
3. サービス `yomibiyori` を選択
4. **Variables** タブをクリック
5. **New Variable** をクリック
6. Variable name: `EXPO_ACCESS_TOKEN`
7. Value: <コピーしたトークン>
8. **Add** をクリック

#### 方法2: Railway CLI
```bash
# サービスを選択（対話的）
railway service

# 環境変数を設定
railway variables --set EXPO_ACCESS_TOKEN=<your-token>

# または、Railwayダッシュボードから直接設定を推奨
```

### Step 4: EAS Project IDの設定（モバイルアプリ用）

```bash
# EAS CLIをインストール（まだの場合）
npm install -g eas-cli

# モバイルディレクトリに移動
cd mobile

# EASにログイン
eas login

# プロジェクトを初期化（既存の場合はスキップ）
eas init

# Project IDを確認
eas project:info
# または https://expo.dev/accounts/<your-account>/projects/yomibiyori

# mobile/.env に追加
echo "EAS_PROJECT_ID=<your-project-id>" >> .env
```

---

## ✅ 設定確認方法

### 1. GitHub Secretsの確認

```bash
gh secret list | grep EXPO_ACCESS_TOKEN
```

期待される出力:
```
EXPO_ACCESS_TOKEN	2025-10-25T20:30:00Z
```

### 2. GitHub Actionsワークフローのテスト実行

#### お題配信通知のテスト
```bash
gh workflow run send_theme_notifications.yml
```

#### 締切リマインダーのテスト
```bash
gh workflow run generate_themes.yml
```

#### ランキング確定通知のテスト
```bash
gh workflow run finalize_rankings.yml
```

実行結果の確認:
```bash
gh run list --limit 5
```

### 3. Railway環境変数の確認

Railway Web UIで確認:
1. https://railway.app/project/<project-id>
2. サービス `yomibiyori` の **Variables** タブ
3. `EXPO_ACCESS_TOKEN` が存在することを確認

### 4. ローカルでのテスト（オプション）

```bash
# 本番DBを使わずにテスト
DATABASE_URL="sqlite:///./test.db" \
EXPO_ACCESS_TOKEN="<your-token>" \
python scripts/send_theme_release_notification.py --date $(date +%Y-%m-%d)
```

---

## 📅 通知スケジュール

設定完了後、以下のスケジュールで自動的に通知が送信されます：

| 時刻 | 通知内容 | ワークフロー | 必要な環境変数 |
|------|---------|-------------|--------------|
| 06:00 JST | お題配信通知 | `send_theme_notifications.yml` | DATABASE_URL, EXPO_ACCESS_TOKEN, SUPABASE_PROJECT_REF |
| 21:50 JST | 締切リマインダー | `generate_themes.yml` | DATABASE_URL, EXPO_ACCESS_TOKEN |
| 22:00 JST | ランキング確定通知 | `finalize_rankings.yml` | DATABASE_URL, REDIS_URL, EXPO_ACCESS_TOKEN, SUPABASE_PROJECT_REF |

---

## 🐛 トラブルシューティング

### 問題: 通知が送信されない

#### 確認1: GitHub Secretsが設定されているか
```bash
gh secret list | grep EXPO_ACCESS_TOKEN
```

#### 確認2: ワークフローが実行されているか
```bash
gh run list --workflow=send_theme_notifications.yml --limit 5
```

#### 確認3: ワークフローのログを確認
```bash
gh run view <run-id> --log
```

#### 確認4: Expo Access Tokenが有効か
- https://expo.dev/accounts/<your-account>/settings/access-tokens
- トークンの有効期限を確認
- トークンが削除されていないか確認

### 問題: Expo APIが401エラーを返す

**原因**: Access Tokenが無効または期限切れ

**解決策**:
1. 新しいAccess Tokenを生成
2. GitHub SecretとRailway環境変数を更新

### 問題: プッシュトークンが登録されない（モバイルアプリ）

**原因**: EAS_PROJECT_IDが未設定またはexpo-notificationsが未インストール

**解決策**:
```bash
cd mobile

# パッケージを確認
npm list expo-notifications

# 未インストールの場合
npx expo install expo-notifications

# EAS Project IDを設定
echo "EAS_PROJECT_ID=<your-project-id>" >> .env
```

---

## 📱 モバイルアプリの追加設定

### 通知アイコンの作成

`mobile/assets/notification-icon.png` を作成してください：
- サイズ: 96x96px
- 形式: PNG
- 背景: 透明
- 色: モノクロ（Androidで使用）

### 開発ビルドでのテスト

Expo Goアプリではプッシュ通知は動作しません。開発ビルドを作成してください：

```bash
cd mobile

# Android開発ビルド
eas build --profile development --platform android

# iOS開発ビルド
eas build --profile development --platform ios
```

---

## 🎯 完了条件

以下の全てが✅になれば、通知機能は完全に動作します：

- [ ] GitHub Secretsに `EXPO_ACCESS_TOKEN` が設定されている
- [ ] Railwayに `EXPO_ACCESS_TOKEN` が設定されている
- [ ] `mobile/.env` に `EAS_PROJECT_ID` が設定されている
- [ ] `mobile/assets/notification-icon.png` が存在する
- [ ] GitHub Actionsワークフローのテスト実行が成功している
- [ ] モバイルアプリでプッシュトークンが登録されている

---

## 📚 参考リンク

- [Expo Push Notifications](https://docs.expo.dev/push-notifications/overview/)
- [Expo Access Tokens](https://docs.expo.dev/accounts/programmatic-access/)
- [GitHub Actions Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [Railway Environment Variables](https://docs.railway.app/develop/variables)
- [EAS Build](https://docs.expo.dev/build/introduction/)

---

**最終更新**: 2025-10-25
**ステータス**: ⚠️ EXPO_ACCESS_TOKEN の設定が必要
