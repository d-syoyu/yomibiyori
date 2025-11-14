# Push Notifications Setup (Expo + FCM v1)

> 2024 年 6 月 20 日以降、Firebase Cloud Messaging のレガシー API（サーバーキー方式 / `https://fcm.googleapis.com/fcm/send`）は完全停止しました。Expo Push も HTTP v1 ベースに移行しているため、Android 通知を届けるには **FCM v1 サービスアカウントキー** の登録が必須です。

このドキュメントでは、詠日和プロジェクトで必要な作業手順をまとめます。

---

## 1. 前提条件

- Expo SDK `>= 51.0.24` および `expo-notifications >= 0.28.15`
- Firebase プロジェクト（例: `yomibiyori`）が作成済み
- `google-services.json` を `mobile/` 以下に配置済み（EAS Build に取り込まれる状態）
- `expo-cli` / `eas-cli` が手元にインストールされている

```
npx expo --version
eas --version
```

---

## 2. FCM v1 サービスアカウントキーを作成

1. [Firebase Console](https://console.firebase.google.com/) → 該当プロジェクト → **プロジェクトの設定** → **サービスアカウント**。
2. 「Firebase Admin SDK」カードの **新しい秘密鍵を生成** をクリックし、`yomibiyori-xxxx.json` をダウンロード。
3. ダウンロードした JSON は公開リポジトリにコミットしない。`credentials/fcm-service-account.json` などの安全な場所に置く。

> **Note:** レガシー Server Key は取得できなくなっているため、必ずこの手順で JSON を用意する。

---

## 3. EAS にサービスアカウントを登録

Expo Push は EAS Build 上の環境変数 `EXPO_NOTIFICATIONS_SERVICE_ACCOUNT` を参照して FCM v1 を利用します。下記のいずれかの方法で登録します。

### CLI から Secret を作成

```bash
cd mobile
eas secret:create \
  --name EXPO_NOTIFICATIONS_SERVICE_ACCOUNT \
  --value "@../credentials/fcm-service-account.json" \
  --type file \
  --scope project
```

### EAS Dashboard から登録

1. https://expo.dev/accounts/<account>/projects/yomibiyori/settings/secrets
2. `Add Secret` → Name に `EXPO_NOTIFICATIONS_SERVICE_ACCOUNT` を入力。
3. `File` タブを選択し、ダウンロード済みの JSON をアップロード。

### Secrets をビルドプロファイルに紐付け

`eas.json` の各プロファイルで secret を参照できるよう、必要に応じて `env` にダミー値を追記（ビルドサーバーでは secret 値が上書きされる）。

```json5
"development": {
  "env": {
    "EXPO_PUBLIC_API_BASE_URL": "https://yomibiyori-production.up.railway.app/api/v1",
    "EXPO_NOTIFICATIONS_SERVICE_ACCOUNT": "@EXPO_NOTIFICATIONS_SERVICE_ACCOUNT"
  }
}
```

> ここで `@EXPO_NOTIFICATIONS_SERVICE_ACCOUNT` は EAS secret を参照する記法です。

---

## 4. Expo プロジェクトに資格情報を紐付け

Expo Push はプロジェクト slug / owner に紐づいたサービスアカウントを使います。

```bash
expo push:android:show
```

- `FCM Service Account` が `configured` になっているか確認。
- 未設定の場合は、Expo CLI からアップロードします。

```bash
expo push:android:upload --service-account-file ../credentials/fcm-service-account.json
```

> `expo credentials:manager -p android` からメニュー操作でも登録できます。

---

## 5. GitHub Actions / Railway 側の注意

バックエンド（FastAPI）は Expo Push API を呼び出すだけなので、GitHub Actions から通知スクリプト (`scripts/send_theme_release_notifications.py` / `scripts/send_ranking_result_notifications.py`) を実行する際、追加の FCM 設定は不要です。ただし以下を確認してください。

- Expo Push API に渡す `EXPO_ACCESS_TOKEN` が Actions Secret に登録済み。
- 失敗したチケットは `_dispatch_notifications` のログに出力されるので、`InvalidCredentials` や `DeviceNotRegistered` が発生していないか確認。

---

## 6. 動作確認

1. Dev Client (EAS Development build) をインストールし、アプリにログイン。
2. プロフィール画面で通知トグル（06:00 / 22:00）を ON にする。
3. `registerForPushNotifications()` が `[Push] Expo push token registered successfully` を出すことを確認。
4. GitHub Actions の `send_theme_notifications` ワークフローを手動実行し、ログに `sent > 0` が出るか確認。
5. 届かない場合は Expo Push receipt を `expo push:status --receipt-id <id>` で確認し、詳細エラーを切り分ける。

---

## 7. FAQ

| 質問 | 対応 |
|------|------|
| レガシー Server Key を取得できない | 上記のようにサービスアカウント JSON を生成し、Expo にアップロードしてください。 |
| `InvalidCredentials` が再発する | Expo project が正しいか（`owner/slug`）、EAS secret に正しい JSON を割り当てたかを確認。Dev/Prod で slug を分けている場合は両方にサービスアカウントを登録する必要があります。 |
| Expo Go で通知を試したい | Expo Go は Push Token を返しますが、最終検証は Dev Client または Production build で行ってください。 |

---

## 参考リンク

- [Expo Push Notifications Setup](https://docs.expo.dev/push-notifications/push-notifications-setup/#get-credentials-for-development-builds)
- [Expo Push API Reference](https://docs.expo.dev/push-notifications/sending-notifications/)
- [Firebase Cloud Messaging HTTP v1](https://firebase.google.com/docs/cloud-messaging/migrate-v1)
