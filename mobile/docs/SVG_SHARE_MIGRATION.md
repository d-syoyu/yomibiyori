# SNS共有機能のSVG化マイグレーション

## 📋 概要

SNS共有機能を`react-native-view-shot`による従来のView階層キャプチャから、**SVGベースの画像生成方式**に移行しました。

## 🎯 背景と目的

### 従来の問題点

1. **不安定なViewスナップショット**
   - `Failed to snapshot view tag`エラーが頻発
   - レイアウト完了のタイミング制御が複雑
   - `collapsable`最適化との競合

2. **Expo Go非対応**
   - 専用ビルドが必須
   - 開発時の動作確認が困難

3. **複雑なレンダリング同期**
   - Modal → ShareCard → LinearGradient → VerticalPoem → VerticalText という深い階層
   - リトライロジックが複雑で保守性が低い

### 新方式のメリット

1. ✅ **安定性の向上**
   - SVGコンポーネントを直接キャプチャ
   - View階層の最適化の影響を受けない

2. ✅ **Expo Go対応**
   - `react-native-svg`は標準パッケージ
   - 開発ビルドでも本番ビルドでも同じ動作

3. ✅ **シンプルな実装**
   - レイアウト待機ロジックが最小限
   - コードの見通しが良い

## 🏗️ アーキテクチャ

### ディレクトリ構成

```
mobile/src/
├── components/
│   ├── svg/
│   │   ├── VerticalPoemSVG.tsx    # SVG版縦書き詩
│   │   └── ShareCardSVG.tsx       # SVG版共有カード
│   ├── ShareSheetSVG.tsx          # SVG版共有シート(新)
│   └── ShareSheet.tsx             # 従来版(非推奨)
├── utils/
│   └── svgToImage.ts              # SVG→PNG変換ユーティリティ
└── screens/
    ├── AppreciationScreen.tsx     # ShareSheetSVGを使用
    ├── MyPoemsScreen.tsx          # ShareSheetSVGを使用
    └── RankingScreen.tsx          # ShareSheetSVGを使用
```

### コンポーネント構成

```
ShareSheetSVG
  └── ShareCardSVG (1080x1920 SVG)
        ├── グラデーション背景
        ├── 白背景オーバーレイ
        ├── バッジ
        ├── キャプション
        ├── VerticalPoemSVG (縦書き詩)
        ├── メタ情報(作者名、日付など)
        └── フッター
```

## 🔧 実装詳細

### 1. VerticalPoemSVG.tsx

SVG`<Text>`要素を使用した縦書き詩コンポーネント。

**主な機能:**
- 文字ごとに`<Text>`要素を配置
- 伸ばし棒・波ダッシュなどを90度回転
- 上の句と下の句を適切な間隔で配置

**Props:**
```typescript
interface VerticalPoemSVGProps {
  upperText?: string;
  lowerText: string;
  x: number;               // 基準X座標
  y: number;               // 基準Y座標
  fontSize?: number;       // フォントサイズ(デフォルト: 32)
  lineHeight?: number;     // 行間(デフォルト: 38)
  spacing?: number;        // 上の句と下の句の間隔(デフォルト: 40)
  lowerBold?: boolean;     // 下の句を太字にするか
}
```

### 2. ShareCardSVG.tsx

共有カード全体のSVGレイアウト。

**サイズ:**
- プレビュー: 360x640 (画面表示用)
- 出力: 1080x1920 (フルHD、SNS推奨サイズ)

**レイアウト要素:**
- グラデーション背景(カテゴリごとの配色)
- 白背景オーバーレイ(透過率92%)
- バッジ(ランキング順位など)
- 縦書き詩
- 作者情報
- フッター(アプリ名、URL)

### 3. ShareSheetSVG.tsx

モーダル形式の共有シート。

**処理フロー:**
1. モーダル表示
2. SVGコンポーネントレンダリング(300ms待機)
3. ユーザーが「画像として共有」をタップ
4. `captureSvgToImageWithRetry()`でPNG変換
5. `expo-sharing`で共有シート表示
6. 一時ファイルをクリーンアップ

### 4. svgToImage.ts

SVGをPNG画像に変換するユーティリティ。

**機能:**
- `captureSvgToImage()`: 基本変換関数
- `captureSvgToImageWithRetry()`: リトライ機能付き(最大3回)

**オプション:**
```typescript
{
  width?: number;    // 出力幅
  height?: number;   // 出力高さ
  quality?: number;  // 画質(0-1、デフォルト: 1)
}
```

## 🔄 マイグレーション手順

### 既存コードの更新

以下の3ファイルで`ShareSheet`のimportを変更:

```diff
- import ShareSheet from '../components/ShareSheet';
+ import ShareSheet from '../components/ShareSheetSVG';
```

**対象ファイル:**
- [AppreciationScreen.tsx](mobile/src/screens/AppreciationScreen.tsx)
- [MyPoemsScreen.tsx](mobile/src/screens/MyPoemsScreen.tsx)
- [RankingScreen.tsx](mobile/src/screens/RankingScreen.tsx)

### 動作確認

1. アプリをビルド(開発ビルドまたは本番ビルド)
2. 各画面で共有ボタンをタップ
3. プレビューが正しく表示されることを確認
4. 「画像として共有」をタップして共有シートが開くことを確認
5. 実際に共有した画像を確認

## 🧪 テスト項目

- [ ] 鑑賞画面からの共有
- [ ] ランキング画面からの共有
- [ ] マイページからの共有
- [ ] 各カテゴリ(恋愛、季節、日常、ユーモア)での表示確認
- [ ] バッジ表示の確認(ランキング)
- [ ] いいね数・スコアの表示確認
- [ ] 縦書き文字の回転確認(ー、〜、…など)
- [ ] 共有後の一時ファイルクリーンアップ

## 📝 注意事項

### フォント対応

SVGコンポーネントで`fontFamily="Noto Serif JP"`を指定していますが、実際のフォント読み込みは`App.tsx`で行う必要があります。

```typescript
// App.tsx
import { useFonts, NotoSerifJP_400Regular, NotoSerifJP_600SemiBold } from '@expo-google-fonts/noto-serif-jp';
```

### プラットフォーム対応

- **iOS/Android**: 完全対応
- **Web**: `react-native-view-shot`が非対応のため動作しない
- **Expo Go**: 動作可能(SVG版の利点)

### パフォーマンス

- SVGレンダリングは軽量
- PNG変換は`react-native-view-shot`を使用するため、従来と同等
- プレビュー表示は360x640で行い、共有時に1080x1920で再キャプチャ

## 🔮 今後の改善案

1. **サーバーサイド生成への移行**
   - クライアント負荷をゼロに
   - OGP画像としても活用可能
   - オフライン対応は失われる

2. **SVG→Base64直接変換**
   - `react-native-view-shot`への依存を排除
   - 完全なクライアント完結
   - ライブラリ調査が必要

3. **キャッシュ機構**
   - 同じ作品の再共有時にキャッシュを使用
   - パフォーマンス向上

## 🐛 トラブルシューティング

### SVGが表示されない

- `react-native-svg`のバージョンを確認(15.12.1以上推奨)
- `npx expo install react-native-svg`で再インストール

### 画像変換に失敗する

- `react-native-view-shot`が正しくインストールされているか確認
- 専用ビルド(dev-clientまたは本番ビルド)を使用しているか確認

### 縦書きの配置がずれる

- `VerticalPoemSVG`の`x`, `y`, `spacing`パラメータを調整
- `ShareCardSVG`内のレイアウト座標を確認

## 📚 参考資料

- [react-native-svg 公式ドキュメント](https://github.com/software-mansion/react-native-svg)
- [react-native-view-shot](https://github.com/gre/react-native-view-shot)
- [Expo Sharing API](https://docs.expo.dev/versions/latest/sdk/sharing/)

---

📄 **最終更新**: 2025-01-XX
✍️ **作成者**: Claude Code Agent
