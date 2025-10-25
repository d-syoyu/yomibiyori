# プッシュ通知セットアップガイド

詠日和モバイルアプリでExpo Push Notificationsを使用するためのセットアップ手順です。

## 必要なパッケージ

以下のパッケージをインストールしてください：

```bash
cd mobile
npx expo install expo-notifications
```

## 環境変数設定

### 1. EAS Project IDの取得

EAS（Expo Application Services）プロジェクトを作成し、Project IDを取得します：

```bash
# EAS CLIをインストール
npm install -g eas-cli

# EASにログイン
eas login

# プロジェクトを初期化
eas init
```

### 2. 環境変数の設定

`mobile/.env` ファイルに以下を追加：

```env
EAS_PROJECT_ID=your-eas-project-id-here
EXPO_PUBLIC_API_BASE_URL=https://yomibiyori-production.up.railway.app/api/v1
```

## バックエンド設定

### 1. Expo Access Tokenの取得

1. https://expo.dev にアクセス
2. アカウント設定 → Access Tokens
3. 新しいトークンを作成（スコープ: `publish` を選択）
4. トークンをコピー

### 2. GitHub Secretsに登録

```bash
gh secret set EXPO_ACCESS_TOKEN
```

または、GitHubリポジトリの Settings → Secrets and variables → Actions から手動で追加。

## 実装内容

### 1. プッシュ通知の種類

- **06:00 お題配信通知**: 毎日06:00 JSTに当日のお題を通知
- **21:50 締切リマインダー**: 毎日21:50 JSTに投稿締切を通知
- **22:00 ランキング確定通知**: 毎日22:00 JSTにランキング確定を通知

### 2. 実装されたファイル

- `src/utils/notifications.ts`: プッシュ通知ユーティリティ
- `src/services/api.ts`: プッシュトークン登録API
- `src/types/index.ts`: プッシュ通知用型定義
- `App.tsx`: プッシュ通知の初期化とリスナー設定
- `app.config.ts`: Expo Notifications プラグイン設定

### 3. 動作フロー

1. アプリ起動時に通知パーミッションを要求
2. ユーザーがログイン成功後、Expo Push Tokenを取得
3. バックエンドAPI（`POST /api/v1/push-subscriptions`）にトークンを登録
4. GitHub Actionsが定期的に通知を送信

## テスト方法

### ローカルでの動作確認

```bash
# アプリを起動
npm start

# 通知パーミッションを許可してログイン
# コンソールに以下のようなログが表示されるはず：
# [Notifications] Expo push token: ExponentPushToken[xxxxx]
# [Notifications] Push token registered successfully
```

### 通知送信テスト

バックエンド側でスクリプトを手動実行：

```bash
# お題配信通知
python scripts/send_theme_release_notification.py --date 2025-10-25

# 締切リマインダー
python scripts/send_submission_reminder.py

# ランキング確定通知
python scripts/finalize_rankings.py --date 2025-10-25
```

## トラブルシューティング

### プッシュトークンが取得できない

- EAS_PROJECT_IDが正しく設定されているか確認
- `app.config.ts` の設定を確認
- アプリを再起動

### 通知が届かない

- 通知パーミッションが許可されているか確認
- Expo Access Tokenが正しく設定されているか確認
- バックエンドのログを確認

### 開発環境での確認

Expo Goアプリでは、プロジェクトIDベースのプッシュ通知は動作しません。
開発ビルド（Development Build）を作成する必要があります：

```bash
eas build --profile development --platform ios
# または
eas build --profile development --platform android
```

## 本番デプロイ前のチェックリスト

- [ ] EAS Project IDが設定されている
- [ ] Expo Access Tokenがバックエンド環境変数に設定されている
- [ ] GitHub Secretsに必要な値が全て設定されている
- [ ] プッシュ通知のテストが成功している
- [ ] 通知アイコン（`assets/notification-icon.png`）が存在する

## 参考リンク

- [Expo Push Notifications](https://docs.expo.dev/push-notifications/overview/)
- [Expo Application Services](https://docs.expo.dev/eas/)
- [GitHub Actions Workflows](../.github/workflows/)
