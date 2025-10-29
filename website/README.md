# よみびより Website

App Store / Google Play公開用の公式Webサイト

## 概要

このWebサイトは、よみびよりアプリのApp Store公開に必要な以下のページを提供します：

- トップページ（アプリ紹介）
- プライバシーポリシー
- 利用規約
- サポート

## 技術スタック

- **Framework**: Next.js 15（App Router）
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Deployment**: Vercel
- **Font**: Noto Serif JP（Google Fonts）

## ローカル開発

```bash
# 依存関係のインストール
npm install

# 開発サーバーの起動
npm run dev
```

ブラウザで `http://localhost:3000` を開いてください。

## Vercelへのデプロイ

### 1. GitHubリポジトリにプッシュ

```bash
cd website
git add .
git commit -m "feat: add website for App Store submission"
git push origin main
```

### 2. Vercelプロジェクトの作成

1. [Vercel](https://vercel.com/)にアクセスし、ログイン
2. 「New Project」をクリック
3. GitHubリポジトリ `yomibiyori` を選択
4. 「Root Directory」を `website` に設定
5. 「Framework Preset」は自動的に `Next.js` が選択される
6. 「Deploy」をクリック

### 3. カスタムドメインの設定（オプション）

1. Vercelプロジェクトの「Settings」→「Domains」
2. カスタムドメインを追加（例: `yomibiyori.app`）
3. DNSレコードを設定

## ディレクトリ構造

```
website/
├── app/
│   ├── layout.tsx          # ルートレイアウト
│   ├── page.tsx            # トップページ
│   ├── globals.css         # グローバルスタイル
│   ├── privacy/
│   │   └── page.tsx        # プライバシーポリシー
│   ├── terms/
│   │   └── page.tsx        # 利用規約
│   └── support/
│       └── page.tsx        # サポート
├── public/                 # 静的ファイル
├── vercel.json             # Vercel設定
└── package.json
```

## ビルド

```bash
npm run build
```

## Lint

```bash
npm run lint
```

## 注意事項

- プライバシーポリシーや利用規約は法的文書のため、実際の運用前に法務専門家の確認を推奨します
- サポートページの問い合わせメールアドレス（support@yomibiyori.app）は実際に使用するアドレスに変更してください
- App StoreのアプリURL（`href="#"`）は、公開後に実際のURLに更新してください

## App Store申請時の要件

Appleの審査ガイドラインに従い、以下のページが必要です：

- ✅ プライバシーポリシー（`/privacy`）
- ✅ 利用規約（`/terms`）
- ✅ サポート/お問い合わせ（`/support`）

これらのページのURLをApp Store Connectの「App情報」に入力してください。

## ライセンス

© 2024 Yomibiyori. All rights reserved.
