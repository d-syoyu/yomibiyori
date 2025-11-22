# クレジットシステム マイグレーション クイックスタート

## 🚀 最短5ステップで完了

### ステップ1: Railwayにログイン

```bash
railway login
```

ブラウザが開くのでログインしてください。

---

### ステップ2: プロジェクトにリンク

```bash
railway link
```

プロジェクトを選択してください。

---

### ステップ3: マイグレーション実行

```bash
railway run alembic upgrade head
```

**成功時の出力例:**
```
INFO  [alembic.runtime.migration] Running upgrade 20250101_01 -> 20250122_01
```

---

### ステップ4: Stripe環境変数を設定

```bash
railway variables set STRIPE_API_KEY="sk_test_xxxxx..."
railway variables set STRIPE_PUBLISHABLE_KEY="pk_test_xxxxx..."
railway variables set STRIPE_WEBHOOK_SECRET="whsec_xxxxx..."
```

**Stripeキーの取得方法:**
1. https://dashboard.stripe.com/ にログイン
2. **開発者 → APIキー** でキーをコピー

---

### ステップ5: Stripe Webhookを設定

1. **Stripeダッシュボード → 開発者 → Webhook** に移動
   - https://dashboard.stripe.com/test/webhooks

2. **エンドポイントを追加**
   ```
   https://your-app.up.railway.app/api/v1/sponsor/credits/webhook
   ```

3. **イベントを選択**
   - ✅ `checkout.session.completed`

4. **署名シークレットをコピー**して環境変数に設定
   ```bash
   railway variables set STRIPE_WEBHOOK_SECRET="whsec_xxxxx..."
   ```

---

## ✅ 完了確認

### マイグレーションの確認

```bash
railway run alembic current
```

**期待される出力:**
```
20250122_01 (head)
```

### テーブルの確認

```bash
railway run psql -c "\dt sponsor*"
```

**期待される出力:**
```
 sponsor_campaigns
 sponsor_credit_transactions  ← 新規
 sponsor_slot_reservations    ← 新規
 sponsor_themes
```

---

## 🧪 動作テスト

### 1. Webサイトにアクセス

```
https://your-website.com/sponsor
```

### 2. クレジット購入をテスト

1. **購入する**ボタンをクリック
2. 数量を入力して**Stripeで購入**
3. テストカードで決済:
   ```
   カード番号: 4242 4242 4242 4242
   有効期限: 12/34
   CVC: 123
   ```
4. ダッシュボードに戻り、クレジット残高が増えていることを確認

### 3. 枠予約をテスト

1. **枠を予約**をクリック
2. カレンダーから日付とカテゴリを選択
3. 緑色の枠をクリック
4. 予約が完了し、青色で表示されることを確認

---

## 📚 詳細ドキュメント

- **詳しいマイグレーション手順**: [docs/MIGRATION_GUIDE.md](docs/MIGRATION_GUIDE.md)
- **環境変数とWebhook設定**: [docs/CREDIT_SYSTEM_SETUP.md](docs/CREDIT_SYSTEM_SETUP.md)

---

## 🆘 トラブルシューティング

### エラー: "No linked project found"

```bash
railway link
```

### エラー: "Unauthorized"

```bash
railway login
```

### Webhookが動作しない

1. URLが正しいか確認
2. `STRIPE_WEBHOOK_SECRET`が設定されているか確認
3. Stripeダッシュボードでイベント配信ログを確認

---

## 🎉 完了！

これでスポンサークレジットシステムが利用可能になりました。

**次のステップ:**
1. ✅ スポンサーがクレジットを購入できる
2. ✅ クレジットで枠を予約できる
3. ✅ お題を投稿できる
4. ✅ 管理者が審査できる
5. ✅ 却下時に自動返金される
