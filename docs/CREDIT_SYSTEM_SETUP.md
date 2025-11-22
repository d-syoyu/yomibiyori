# スポンサークレジットシステム セットアップガイド

## 📋 目次
1. [環境変数の設定](#環境変数の設定)
2. [マイグレーション実行](#マイグレーション実行)
3. [Stripe Webhook設定](#stripe-webhook設定)
4. [動作確認](#動作確認)

---

## 🔧 環境変数の設定

### 必要な環境変数

以下の環境変数をRailwayまたは`.env`ファイルに追加してください:

```bash
# Stripe設定
STRIPE_API_KEY=sk_test_xxxxx...           # StripeのSecret Key (テスト環境)
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx...   # StripeのPublishable Key (テスト環境)
STRIPE_WEBHOOK_SECRET=whsec_xxxxx...      # Webhook署名検証用シークレット

# クレジット価格設定 (オプション、デフォルト: 10000)
SPONSOR_CREDIT_PRICE_JPY=10000            # 1クレジットの価格 (円)
```

### Stripe APIキーの取得方法

1. **Stripeダッシュボードにログイン**
   - https://dashboard.stripe.com/

2. **開発者 → APIキー**に移動
   - テスト環境: `sk_test_...` で始まるSecret Key
   - 本番環境: `sk_live_...` で始まるSecret Key

3. **キーをコピー**
   ```bash
   STRIPE_API_KEY=sk_test_51Xxxxx...
   STRIPE_PUBLISHABLE_KEY=pk_test_51Xxxxx...
   ```

### Railwayでの環境変数設定

#### 方法1: Railway CLI (推奨)

```bash
# プロジェクトディレクトリで実行
railway variables set STRIPE_API_KEY="sk_test_xxxxx..."
railway variables set STRIPE_PUBLISHABLE_KEY="pk_test_xxxxx..."
railway variables set STRIPE_WEBHOOK_SECRET="whsec_xxxxx..."
railway variables set SPONSOR_CREDIT_PRICE_JPY="10000"
```

#### 方法2: Railway Dashboard

1. Railway Dashboardでプロジェクトを開く
2. サービスを選択
3. **Variables**タブをクリック
4. **New Variable**で以下を追加:
   - `STRIPE_API_KEY`
   - `STRIPE_PUBLISHABLE_KEY`
   - `STRIPE_WEBHOOK_SECRET`
   - `SPONSOR_CREDIT_PRICE_JPY` (オプション)

---

## 🗄️ マイグレーション実行

### Railwayでマイグレーションを実行

```bash
# Railway環境でマイグレーション実行
railway run alembic upgrade head
```

### ローカルでマイグレーション実行 (開発環境)

```bash
# .envファイルのDATABASE_URLを使用
alembic upgrade head
```

### マイグレーション内容の確認

このマイグレーション(`20250122_01_sponsor_credits_system.py`)では以下が実行されます:

1. **sponsors テーブル**
   - `credits` カラム追加 (INTEGER, デフォルト: 0)
   - `plan_tier` カラム削除

2. **sponsor_slot_reservations テーブル作成**
   - 枠予約情報を管理
   - UNIQUE制約: (date, category) - 同一枠への重複予約を防止

3. **sponsor_credit_transactions テーブル作成**
   - クレジット増減の履歴を記録
   - 購入/使用/返金/調整を追跡

4. **sponsor_themes テーブル**
   - `reservation_id` カラム追加 (外部キー)

---

## 🔗 Stripe Webhook設定

### 1. Webhook Endpointを追加

1. **Stripeダッシュボード → 開発者 → Webhook**
   - https://dashboard.stripe.com/test/webhooks

2. **エンドポイントを追加**
   ```
   https://your-domain.up.railway.app/api/v1/sponsor/credits/webhook
   ```

3. **リッスンするイベントを選択**
   - `checkout.session.completed` ✅ (必須)

### 2. Webhook署名シークレットを取得

1. 作成したWebhookをクリック
2. **署名シークレット**をコピー
   ```
   whsec_xxxxx...
   ```

3. 環境変数に設定
   ```bash
   railway variables set STRIPE_WEBHOOK_SECRET="whsec_xxxxx..."
   ```

### 3. Webhookの動作確認

#### テストイベントを送信

Stripeダッシュボードから:
1. Webhook詳細ページ
2. **テストイベントを送信**
3. `checkout.session.completed`を選択
4. メタデータを編集:
   ```json
   {
     "client_reference_id": "スポンサーのuser_id",
     "metadata": {
       "credit_quantity": "5"
     }
   }
   ```

#### ログで確認

```bash
railway logs
```

成功時のログ:
```
Successfully processed payment for sponsor {sponsor_id}: +{quantity} credits
```

---

## ✅ 動作確認

### 1. クレジット購入フロー

1. スポンサーダッシュボードにアクセス
   ```
   https://your-website.com/sponsor
   ```

2. **購入する**ボタンをクリック

3. クレジット購入ページで数量を入力して**Stripeで購入**

4. Stripe Checkoutページで決済 (テストカード使用可能)
   ```
   カード番号: 4242 4242 4242 4242
   有効期限: 任意の未来日
   CVC: 任意の3桁
   ```

5. 成功後、ダッシュボードに戻りクレジット残高が増加していることを確認

### 2. 枠予約フロー

1. **枠を予約**をクリック

2. カレンダーから日付とカテゴリを選択

3. 緑色の枠をクリックして予約

4. 予約済み枠として青色で表示されることを確認

### 3. 却下時の返金フロー

1. 管理画面で予約済み枠のお題を却下

2. スポンサーのクレジット残高が自動的に+1されることを確認

3. 取引履歴に「返金」が記録されることを確認

---

## 🧪 テストカード情報

### 成功パターン

| カード番号 | 用途 |
|-----------|------|
| 4242 4242 4242 4242 | 通常の成功 |
| 4000 0566 5566 5556 | 3D Secure認証成功 |

### 失敗パターン

| カード番号 | 結果 |
|-----------|------|
| 4000 0000 0000 0002 | カード拒否 |
| 4000 0000 0000 9995 | 残高不足 |

参考: https://stripe.com/docs/testing#cards

---

## 🚨 トラブルシューティング

### Webhookが動作しない

**症状**: 決済完了後もクレジットが増えない

**確認事項**:
1. Webhook URLが正しいか確認
   ```
   https://your-domain.up.railway.app/api/v1/sponsor/credits/webhook
   ```

2. `STRIPE_WEBHOOK_SECRET`が設定されているか確認
   ```bash
   railway variables
   ```

3. Stripeダッシュボードでイベント配信を確認
   - Webhook詳細ページで配信ログを確認
   - エラーがある場合はレスポンスを確認

4. アプリケーションログを確認
   ```bash
   railway logs
   ```

### マイグレーションエラー

**症状**: `alembic upgrade head`でエラー

**対処法**:
```bash
# 現在のバージョン確認
railway run alembic current

# マイグレーション履歴確認
railway run alembic history

# 強制的に特定バージョンにスタンプ (注意!)
railway run alembic stamp 20250122_01
```

### クレジット残高が合わない

**確認事項**:
1. トランザクションテーブルを確認
   ```sql
   SELECT * FROM sponsor_credit_transactions
   WHERE sponsor_id = 'xxx'
   ORDER BY created_at DESC;
   ```

2. 現在の残高を確認
   ```sql
   SELECT credits FROM sponsors WHERE id = 'xxx';
   ```

3. 期待値との差分を確認し、必要に応じて管理者調整

---

## 📚 関連ドキュメント

- [Stripe Checkout ドキュメント](https://stripe.com/docs/payments/checkout)
- [Stripe Webhooks ドキュメント](https://stripe.com/docs/webhooks)
- [Railway環境変数設定](https://docs.railway.app/develop/variables)

---

## 🎯 本番環境への移行

### テスト環境 → 本番環境

1. **Stripeを本番モードに切り替え**
   ```bash
   STRIPE_API_KEY=sk_live_xxxxx...
   STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx...
   ```

2. **本番用Webhookを追加**
   - 本番環境用の新しいWebhook Endpointを作成
   - 新しい署名シークレットを取得・設定

3. **価格設定の確認**
   ```bash
   SPONSOR_CREDIT_PRICE_JPY=10000  # 本番価格
   ```

4. **動作テスト**
   - 少額での実決済テスト
   - 返金フローの確認

---

## ✨ まとめ

このガイドに従って設定を完了すると:

- ✅ スポンサーがクレジットを購入できる
- ✅ クレジットで枠を予約できる
- ✅ お題却下時に自動返金される
- ✅ すべての取引が記録される

問題が発生した場合は、上記のトラブルシューティングを参照してください。
