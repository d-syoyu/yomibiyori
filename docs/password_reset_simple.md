# パスワードリセット機能 - シンプル版

## ✨ 何がシンプルになったか

従来の複雑な実装から、**ブラウザベース**の超シンプルな方式に変更しました。

### 削除した複雑な要素
- ❌ ディープリンク設定（`yomibiyori://`スキーム）
- ❌ UpdatePasswordScreen（アプリ内パスワード更新画面）
- ❌ ナビゲーションリンク設定
- ❌ メールテンプレートの複雑なカスタマイズ

### 追加したシンプルな要素
- ✅ 1つのHTMLページ（`reset_password.html`）
- ✅ 1つのエンドポイント（`GET /reset-password`）
- ✅ ブラウザを開くボタンのみ

---

## 🚀 動作フロー

```
1. アプリのログイン画面
   ↓
2. 「パスワードを忘れた方はこちら」をタップ
   ↓
3. 「ブラウザで開く」ボタンをタップ
   ↓
4. ブラウザでWebページが開く
   ↓
5. メールアドレスを入力
   ↓
6. パスワードリセットメールを受信
   ↓
7. メール内のリンクをクリック
   ↓
8. Supabaseのデフォルトページでパスワード変更
   ↓
9. アプリに戻ってログイン ✨
```

---

## 📁 実装されたファイル

### バックエンド
1. **`app/templates/reset_password.html`** - パスワードリセットページ
2. **`app/main.py`** - `/reset-password` エンドポイント追加

### モバイルアプリ
1. **`mobile/src/screens/PasswordResetScreen.tsx`** - ブラウザを開くボタン
2. **`mobile/src/screens/LoginScreen.tsx`** - リンク追加（変更なし）

---

## ⚙️ 設定方法

### 1. Supabase設定（最小限）

#### a. Site URL設定
1. [Supabase Dashboard](https://app.supabase.com) でプロジェクトを開く
2. **Settings** → **General**
3. **Site URL** に以下を設定:
   ```
   https://yomibiyori-production.up.railway.app
   ```
   開発環境の場合:
   ```
   http://localhost:8000
   ```

#### b. Email Templates（重要）
**必須設定**: デフォルトのテンプレートでは動作しません。以下のように設定してください：

1. **Authentication** → **Email Templates** → **Reset Password**
2. テンプレートを以下のように編集：

```html
<a href="{{ .SiteURL }}/reset-password?token_hash={{ .TokenHash }}&type=recovery">パスワードを再設定</a>
```

**重要**: `{{ .TokenHash }}` を使用してください。`{{ .Token }}` や `{{ .ConfirmationURL }}` は使用しないでください。

詳細は [`docs/supabase_email_template_setup.md`](./supabase_email_template_setup.md) を参照。

#### c. SMTP設定（本番環境のみ）
開発環境では不要です。本番環境では以下のいずれかを設定:
- Gmail
- SendGrid
- Amazon SES
- Mailgun

詳細は [Supabase Docs - SMTP](https://supabase.com/docs/guides/auth/auth-smtp) を参照

### 2. アプリの動作確認

```bash
# バックエンドを起動
cd backend
uvicorn app.main:app --reload

# モバイルアプリを起動
cd mobile
npm start
```

### 3. テスト手順

1. アプリでログイン画面を開く
2. 「パスワードを忘れた方はこちら」をタップ
3. 「ブラウザで開く」をタップ
4. ブラウザが開いたら、メールアドレスを入力
5. 「リセットメールを送信」をクリック

**開発環境:**
- Supabase Dashboard → **Authentication** → **Inbucket** でメールを確認

**本番環境:**
- 実際のメールボックスを確認

6. メール内のリンクをクリック
7. Supabaseのページでパスワードを変更
8. アプリに戻ってログイン

---

## 🎯 メリット

### ユーザー視点
- シンプルで直感的
- 既存のブラウザベースのフローと同じ
- メールでパスワードリセットは一般的なパターン

### 開発者視点
- **設定が超シンプル** - ディープリンク不要
- **メンテナンスが楽** - Webページ1つだけ
- **デバッグが簡単** - ブラウザの開発者ツールが使える
- **Supabaseの標準機能を活用** - カスタマイズ最小限

### セキュリティ
- Supabaseの標準フローを使うため安全
- トークンの扱いがシンプル
- ディープリンクのセキュリティ問題を回避

---

## 📝 エンドポイント

### GET /reset-password
パスワードリセット用のHTMLページを配信

**使い方:**
```bash
# ブラウザで開く
http://localhost:8000/reset-password

# 本番環境
https://yomibiyori-production.up.railway.app/reset-password
```

### POST /api/v1/auth/password-reset
パスワードリセットメールを送信

**リクエスト:**
```json
{
  "email": "user@example.com"
}
```

**レスポンス:**
```json
{
  "message": "パスワードリセットメールを送信しました"
}
```

---

## 🔧 トラブルシューティング

### ブラウザが開かない
**問題:** 「ブラウザで開く」をタップしても何も起きない

**解決策:**
1. エミュレータ/シミュレータを再起動
2. アプリを再起動
3. `app.config.ts` の `apiBaseUrl` が正しいか確認

### メールが届かない
**問題:** パスワードリセットメールが届かない

**解決策:**
- **開発環境:** Supabase Dashboard → Authentication → Inbucket で確認
- **本番環境:** SMTP設定を確認、スパムフォルダを確認

### Webページが表示されない
**問題:** 404エラーが表示される

**解決策:**
1. バックエンドが起動しているか確認
2. `app/templates/reset_password.html` が存在するか確認
3. ブラウザのURLを確認（`/reset-password`）

---

## 🆚 従来版との比較

| 項目 | シンプル版 | 従来版 |
|------|-----------|--------|
| ディープリンク | 不要 | 必要 |
| 追加画面数 | 0画面 | 1画面 |
| Supabase設定 | 最小限 | 複雑 |
| メール設定 | デフォルト | カスタム必須 |
| デバッグ難易度 | 簡単 | やや難 |
| ユーザー体験 | ブラウザ経由 | アプリ内完結 |

---

## 🌟 推奨事項

### このシンプル版がおすすめな場合
- ✅ MVP（最小実装）で早く公開したい
- ✅ メンテナンスコストを抑えたい
- ✅ ブラウザ経由でも問題ない

### 従来版を検討すべき場合
- ❌ アプリ内で完結させたい
- ❌ ディープリンクの実装経験がある
- ❌ より統一されたUXを提供したい

---

これで、パスワードリセット機能が**超シンプル**に実装できました！🎉
