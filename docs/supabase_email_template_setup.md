# Supabaseメールテンプレート設定ガイド

## パスワードリセットメールテンプレートの設定

パスワードリセット機能を正しく動作させるには、Supabaseのメールテンプレートを正しく設定する必要があります。

## 設定手順

### 1. Supabase Dashboardにアクセス

1. [Supabase Dashboard](https://app.supabase.com)にログイン
2. プロジェクトを選択
3. **Authentication** → **Email Templates**に移動

### 2. Reset Password テンプレートを編集

「Reset Password」テンプレートを選択し、以下のように設定します：

#### ✅ 正しい設定

```html
<h2>パスワード再設定</h2>

<p>詠日和のパスワードをリセットするには、以下のリンクをクリックしてください：</p>

<p><a href="{{ .SiteURL }}/reset-password?token_hash={{ .TokenHash }}&type=recovery">パスワードを再設定</a></p>

<p>このリンクは1時間有効です。</p>

<p>もしパスワード再設定を依頼していない場合は、このメールを無視してください。</p>
```

#### ❌ 間違った設定

以下のような設定は**動作しません**：

```html
<!-- ❌ {{ .Token }} を使用（これはOTPコードで短い数字のみ） -->
<a href="{{ .SiteURL }}/reset-password?access_token={{ .Token }}&type=recovery">

<!-- ❌ {{ .ConfirmationURL }} を使用（これはデフォルトのSupabaseページに飛ぶ） -->
<a href="{{ .ConfirmationURL }}">
```

### 3. 変数の説明

| 変数 | 説明 | 例 |
|------|------|-----|
| `{{ .SiteURL }}` | Authentication Settings → Site URLで設定したURL | `https://yomibiyori-production.up.railway.app` |
| `{{ .TokenHash }}` | ハッシュ化されたトークン（長い文字列） | `pkce_abc123...xyz789` |
| `{{ .Token }}` | OTPコード（6桁の数字、使用しない） | `911952` |
| `{{ .Email }}` | ユーザーのメールアドレス | `user@example.com` |

### 4. Site URL の設定

**Authentication** → **URL Configuration** で以下を設定：

#### 本番環境
```
Site URL: https://yomibiyori-production.up.railway.app
```

#### 開発環境（ローカル）
```
Site URL: http://localhost:8000
```

**重要**: Site URLの末尾にスラッシュ（`/`）を付けないでください。

### 5. Redirect URLs の設定

同じく **URL Configuration** で、以下を**Redirect URLs**に追加：

```
https://yomibiyori-production.up.railway.app/reset-password
http://localhost:8000/reset-password
```

## テンプレート全文（推奨）

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>パスワード再設定 - 詠日和</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0;">詠日和</h1>
    </div>

    <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
        <h2 style="color: #333; margin-top: 0;">パスワード再設定のご案内</h2>

        <p>こんにちは、</p>

        <p>詠日和のパスワードリセットリクエストを受け付けました。</p>

        <p>以下のボタンをクリックして、新しいパスワードを設定してください：</p>

        <div style="text-align: center; margin: 30px 0;">
            <a href="{{ .SiteURL }}/reset-password?token_hash={{ .TokenHash }}&type=recovery"
               style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                      color: white;
                      padding: 14px 28px;
                      text-decoration: none;
                      border-radius: 8px;
                      font-weight: bold;
                      display: inline-block;">
                パスワードを再設定
            </a>
        </div>

        <p style="font-size: 14px; color: #666;">
            このリンクは<strong>1時間</strong>有効です。
        </p>

        <p style="font-size: 14px; color: #666;">
            もしパスワード再設定を依頼していない場合は、このメールを無視してください。
            あなたのパスワードは変更されません。
        </p>

        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">

        <p style="font-size: 12px; color: #999; text-align: center;">
            このメールは詠日和から自動送信されています。<br>
            返信しないでください。
        </p>
    </div>
</body>
</html>
```

## トラブルシューティング

### 問題: 403 Forbidden エラーが出る

**原因**: メールテンプレートで `{{ .Token }}` を使用している

**解決策**: `{{ .TokenHash }}` に変更する

### 問題: リンクをクリックするとSupabaseのデフォルトページに飛ぶ

**原因**: `{{ .ConfirmationURL }}` を使用している

**解決策**: `{{ .SiteURL }}/reset-password?token_hash={{ .TokenHash }}&type=recovery` を使用する

### 問題: メールが届かない

**開発環境**:
- Supabase Dashboard → **Authentication** → **Logs** で確認
- Inbucket（開発用メールサーバー）を確認

**本番環境**:
- SMTP設定を確認（**Settings** → **Authentication** → **SMTP Settings**）
- スパムフォルダを確認

### 問題: "invalid token" エラーが出る

**原因**:
1. トークンの有効期限が切れている（1時間以内に使用する必要があります）
2. トークンが既に使用されている（使い捨てです）
3. URLが途中で切れている

**解決策**:
1. 新しいパスワードリセットメールを送信する
2. メールクライアントがURLを改行していないか確認する

## 確認方法

設定が正しいか確認するには：

1. アプリでパスワードリセットをリクエスト
2. メールを確認
3. URLが以下の形式になっているか確認：
   ```
   https://yomibiyori-production.up.railway.app/reset-password?token_hash=pkce_XXXXXX&type=recovery
   ```
4. `token_hash` パラメータが長い文字列（100文字以上）であることを確認

## 参考リンク

- [Supabase Email Templates Documentation](https://supabase.com/docs/guides/auth/auth-email-templates)
- [Supabase Auth SMTP Configuration](https://supabase.com/docs/guides/auth/auth-smtp)
