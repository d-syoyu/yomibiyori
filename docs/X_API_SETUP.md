# X (Twitter) API 自動投稿設定ガイド

このドキュメントは、よみびよりのお題を毎朝6時にX(Twitter)へ自動投稿するための設定手順を説明します。

## 概要

- **機能**: 毎朝6時(JST)に今日のお題をX(Twitter)に自動投稿
- **投稿内容**: お題の画像 + お題テキスト + アプリへの誘導文
- **実行方法**: GitHub Actionsによる定期実行 (cron: `0 21 * * *` UTC = 06:00 JST)

## 前提条件

1. X Developer アカウント
2. X API の有料プラン (Basic以上推奨)
   - 理由: API v2でのツイート投稿とメディアアップロードには有料プランが必要

## 1. X Developer Portal でアプリを作成

### 1.1 プロジェクトとアプリの作成

1. [X Developer Portal](https://developer.twitter.com/en/portal/dashboard) にアクセス
2. 「Projects & Apps」→「+ Create Project」をクリック
3. プロジェクト名を入力 (例: `yomibiyori-bot`)
4. Use caseを選択 (例: `Making a bot`)
5. プロジェクトの説明を入力
6. アプリ名を入力 (例: `yomibiyori-theme-poster`)

### 1.2 API Keys と Access Tokens の取得

#### API Key と API Secret Key (Consumer Keys)

1. アプリの「Keys and tokens」タブを開く
2. 「API Key and Secret」セクションで「Regenerate」をクリック
3. 表示された以下の値を安全な場所に保存:
   - `API Key` (Consumer Key)
   - `API Secret Key` (Consumer Secret)

#### Access Token と Access Token Secret

1. 同じページの「Authentication Tokens」セクションを探す
2. 「Access Token and Secret」で「Generate」をクリック
3. **重要**: App permissionsを「Read and Write」に設定
4. 表示された以下の値を安全な場所に保存:
   - `Access Token`
   - `Access Token Secret`

### 1.3 App permissions の確認

1. アプリの「Settings」タブを開く
2. 「User authentication settings」→「Set up」をクリック
3. App permissionsを「Read and Write」に設定
4. Callback URLとWebsite URLを設定 (例: `https://yomibiyori.app`)
5. 保存

## 2. GitHub Secrets の設定

GitHub リポジトリに以下のシークレットを追加します。

### 2.1 シークレットの追加手順

1. GitHubリポジトリページを開く
2. 「Settings」→「Secrets and variables」→「Actions」を選択
3. 「New repository secret」をクリック
4. 以下の4つのシークレットを追加:

| Name | Value | 説明 |
|------|-------|------|
| `X_API_KEY` | API Key | X Developer Portalで取得したAPI Key |
| `X_API_SECRET` | API Secret Key | X Developer Portalで取得したAPI Secret Key |
| `X_ACCESS_TOKEN` | Access Token | X Developer Portalで取得したAccess Token |
| `X_ACCESS_TOKEN_SECRET` | Access Token Secret | X Developer Portalで取得したAccess Token Secret |

### 2.2 既存のシークレット

以下のシークレットは既に設定されているはずです:

- `DATABASE_URL`: PostgreSQLデータベース接続URL

## 3. ワークフローの動作確認

### 3.1 手動実行でテスト

1. GitHubリポジトリの「Actions」タブを開く
2. 左サイドバーから「Post Theme to X」ワークフローを選択
3. 「Run workflow」→「Run workflow」をクリック
4. 実行結果を確認:
   - ✅ 成功した場合: Xアカウントにツイートが投稿される
   - ❌ 失敗した場合: ログを確認してエラーを修正

### 3.2 よくあるエラーと対処法

#### エラー: `Missing X API credentials`

**原因**: GitHub Secretsが正しく設定されていない

**対処法**:
1. GitHub Secretsの名前が正確か確認 (`X_API_KEY`, `X_API_SECRET`, `X_ACCESS_TOKEN`, `X_ACCESS_TOKEN_SECRET`)
2. 値が正しくコピー&ペーストされているか確認

#### エラー: `403 Forbidden` または `401 Unauthorized`

**原因**:
- App permissionsが「Read and Write」になっていない
- Access Tokenが古い、または無効

**対処法**:
1. X Developer Portalでapp permissionsを「Read and Write」に変更
2. Access TokenとAccess Token Secretを再生成
3. GitHub Secretsを新しい値で更新

#### エラー: `No theme found for today`

**原因**: 今日のお題がデータベースに存在しない

**対処法**:
1. お題生成ワークフローが正常に動作しているか確認
2. データベースに今日の日付のお題が存在するか確認

#### エラー: `Failed to load font`

**原因**: 日本語フォントがシステムにインストールされていない

**対処法**:
- GitHub Actionsワークフローに既に `fonts-noto-cjk` のインストール手順が含まれているため、通常は発生しない
- 発生した場合はワークフローログを確認

## 4. スケジュールの調整

デフォルトでは毎朝6時(JST)に実行されます。時刻を変更する場合:

1. [.github/workflows/post_theme_to_x.yml](.github/workflows/post_theme_to_x.yml) を編集
2. `cron` の値を変更:
   ```yaml
   schedule:
     - cron: "0 21 * * *" # 06:00 JST
   ```
   - UTC時刻で指定 (JST = UTC + 9時間)
   - 例: 07:00 JST → `"0 22 * * *"`
   - 例: 18:00 JST → `"0 9 * * *"`

## 5. ツイート内容のカスタマイズ

ツイートの文面を変更する場合は、[scripts/post_theme_to_x.py](scripts/post_theme_to_x.py)の`generate_tweet_text()`関数を編集してください。

### 現在の投稿内容

```
🌸 {日付}のお題

📖 カテゴリ: {カテゴリ名}

{お題テキスト}

よみびよりアプリで下の句を詠んでみませんか?
#よみびより #短歌 #詩 #AI
```

### カスタマイズ例

```python
def generate_tweet_text(theme: Theme) -> str:
    # ... (既存のコード)

    tweet_text = f"""🌸 本日のお題

{theme.text}

アプリで詠んでシェアしよう!
https://yomibiyori.app

#よみびより #{category_label}"""

    return tweet_text
```

## 6. トラブルシューティング

### ワークフローが実行されない

1. GitHub Actionsが有効になっているか確認
2. リポジトリの「Settings」→「Actions」→「General」で「Allow all actions and reusable workflows」が選択されているか確認

### ツイートが投稿されるが画像が添付されない

1. X APIの画像アップロード制限を確認 (最大5MB)
2. ログで `media_id` が取得できているか確認
3. 画像生成処理でエラーが発生していないか確認

### レート制限エラー

X APIには以下のレート制限があります:

- ツイート投稿: 300回/3時間 (Basicプラン)
- メディアアップロード: 制限は緩い

1日1回の投稿であれば問題ありませんが、テスト時は注意してください。

## 7. セキュリティ上の注意事項

⚠️ **重要**: 以下の情報は絶対にリポジトリにコミットしないでください:

- API Key (Consumer Key)
- API Secret Key (Consumer Secret)
- Access Token
- Access Token Secret

これらは必ずGitHub Secretsに保存してください。

## 8. 参考リンク

- [X API Documentation](https://developer.twitter.com/en/docs/twitter-api)
- [Tweepy Documentation](https://docs.tweepy.org/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [X Developer Portal](https://developer.twitter.com/en/portal/dashboard)

## 9. サポート

問題が解決しない場合は、以下を確認してください:

1. GitHub Actionsのワークフローログ
2. X Developer Portalのアプリ設定
3. データベースのお題データ

それでも解決しない場合は、開発チームに連絡してください。
