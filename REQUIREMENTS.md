# 📘 REQUIREMENTS.md — 詠日和 要件定義書

## 🎯 プロジェクト概要
詠日和（よみびより）は、AIが詠む「上の句」と人が応える「下の句」によって、日々の詩を通じた共鳴を育むSNSアプリです。  
ユーザーは毎朝6:00に配信されるお題に対して1日1首まで詠むことができ、22:00にその日の共鳴ランキングが確定します。

---

## 🧩 機能要件（Functional Requirements）

### 1. アカウント／認証
- **要件ID**: FR-001  
- **概要**: Supabase Authを利用し、メール・OAuth（Google/Apple）でログイン。  
- **詳細**:
  - JWTによる認証。
  - 同一ユーザーはカテゴリごとに1日1首まで投稿可能。
  - 役割: `authenticated` は通常ユーザー、`service_role` は管理ジョブが利用し、RLSポリシーと整合させる。
  - 未認証ユーザーは閲覧のみ可能。
  - アプリ側 `users` テーブルは Supabase `auth.users` の `id` / `email` / `user_metadata.display_name` を同期し、メールアドレスは一意に保持する。

### 2. お題（上の句）生成・配信
- **要件ID**: FR-002  
- **概要**: 毎日21:00にGPTモデルが「上の句」をカテゴリ別に生成。  
- **詳細**:
  - ジョブスケジューラ（Cloudflare WorkersまたはRailway）で定時実行。
  - 生成データはPostgreSQLに保存。
  - 翌朝6:00に配信（Push通知）。

### 3. 下の句投稿
- **要件ID**: FR-003  
- **概要**: ユーザーが上の句に対して下の句を1日1回投稿。  
- **詳細**:
  - 下の句は40文字以内。
  - 投稿時刻を保存。
  - 投稿後は自動で鑑賞ページへ遷移。
  - 投稿内容はRLSでユーザー自身のみ編集可能。

### 4. 鑑賞・いいね（共鳴）
- **要件ID**: FR-004  
- **概要**: 他ユーザーの作品を閲覧し、共鳴（いいね）を送信可能。  
- **詳細**:
  - Redis ZSETを利用してリアルタイムスコアを更新。
  - 同一ユーザーからの重複いいね防止（ユーザーID＋作品IDで一意）。

### 5. ランキング・スコア算出
- **要件ID**: FR-005  
- **概要**: 共鳴スコアと補正値でリアルタイムランキングを表示。  
- **詳細**:
  - Wilson信頼区間を採用。
  - 投稿時刻による補正（早期投稿の有利不利を軽減）。
  - Redis → PostgreSQLへ定期スナップショット。

### 6. ランキング確定処理
- **要件ID**: FR-006  
- **概要**: 22:00に当日のランキングを確定し保存。  
- **詳細**:
  - CronでRedisスナップショットをDBへ書き込み。
  - 「余韻フェーズ」では閲覧のみ許可。

### 7. スポンサー上の句（広告）
- **要件ID**: FR-007  
- **概要**: 企業が広告として上の句を投稿可能。  
- **詳細**:
  - スポンサー専用管理ページ（Web側）を提供。
  - お題一覧に「提供：○○珈琲」など詩的表現で掲載。
  - ターゲティング：地域（複数選択可）・年齢幅・カテゴリ別を指定可能。

### 8. 通知
- **要件ID**: FR-008  
- **概要**: Expo Pushを用いて、配信・締切を通知。  
- **詳細**:
  - 6:00: お題配信通知  
  - 21:50: 投稿締切間近リマインド  
  - 22:00: ランキング確定通知

### 9. モバイルアプリUI
- **要件ID**: FR-009  
- **概要**: React Native + Expoで実装。  
- **画面構成**:
  1. ログイン／登録画面
  2. ホーム（お題＋投稿）
  3. 鑑賞・いいね画面
  4. ランキング表示画面
  5. マイページ（過去作品・共鳴履歴）

---

## 🎨 UI仕様（UI Specification）

### 1. 画面構成（Screen Structure）
1. **LoginScreen**
   - メール／OAuthログイン
   - 初回利用時のみユーザー名登録
   - 背景に柔らかな和紙テクスチャ  
2. **HomeScreen**
   - 今日の「上の句」カード（カテゴリ・スポンサー名表示）
   - 下の句入力欄（最大40文字）
   - 「詠む」ボタン（押下で投稿→鑑賞画面へ遷移）
   - 残り時間タイマー（21:59締切までのカウントダウン）  
3. **AppreciationScreen**
   - ランダムまたはカテゴリ順に他人の作品を表示
   - 共鳴ボタン（ハート／共鳴数リアルタイム表示）
   - スワイプで次の作品へ
   - 右上に「マイページ」導線  
4. **RankingScreen**
   - 当日のランキング上位20首を表示
   - スコア（共鳴数＋補正値）と作者名表示
   - 22:00以降はスナップショットモード（更新停止）
   - 「昨日」「一昨日」など日付別切り替えタブ  
5. **MyPageScreen**
   - 自分の過去作品・共鳴履歴を一覧表示
   - 平均共鳴数・累計共鳴ポイント
   - 設定（ログアウト／通知オンオフ）  

---

### 2. 画面遷移（Navigation Flow）
```
LoginScreen
   ↓
HomeScreen
   ├─> AppreciationScreen（投稿後自動遷移）
   ├─> RankingScreen（タブ or ボタン）
   └─> MyPageScreen（右上プロフィールアイコン）
```

- 22:00以降はRankingScreenとAppreciationScreenのみ利用可能。
- 起動時はサーバ時刻に応じてフェーズを自動判定（通常／余韻）。

---

### 3. コンポーネント構成（Component Hierarchy）
```
HomeScreen
 ├─ ThemeCard（上の句＋スポンサー表記）
 ├─ PoemInputBox（下の句入力欄）
 ├─ SubmitButton（詠むボタン）
 └─ TimerBanner（締切カウントダウン）

AppreciationScreen
 ├─ PoemCard（作品本文＋作者＋共鳴数）
 ├─ LikeButton（共鳴ボタン）
 └─ SwipeNavigator（左右スワイプ遷移）

RankingScreen
 ├─ RankingList（Top20）
 ├─ ScoreBadge（Wilson補正後スコア）
 └─ DateTabs（日別切り替え）

MyPageScreen
 ├─ WorkHistoryList（自作一覧）
 ├─ ResonanceSummary（平均共鳴）
 └─ SettingsPanel（通知設定など）
```

---

### 4. 状態遷移（App State）
| 状態 | 条件 | UIモード |
|------|------|-----------|
| 通常フェーズ | 06:00〜21:59 | 投稿＋鑑賞可能 |
| 締切直前 | 21:50〜21:59 | 投稿ボタンに「締切間近」警告 |
| 余韻フェーズ | 22:00〜翌06:00 | 投稿不可・閲覧専用 |
| 未ログイン | 認証なし | 閲覧専用・投稿不可 |

---

## ⚙️ 非機能要件（Non‑Functional Requirements）

### パフォーマンス
- 投稿・いいね処理は100ms以内に応答。
- Redisキャッシュによるリアルタイム性を確保。

### セキュリティ
- Row Level Security (RLS) でユーザーごとアクセス制御。
- JWT署名・有効期限チェック必須。
- HTTPS通信のみ許可。

### 可用性
- 稼働率99%以上を目標。
- Cronジョブは冗長化構成（Workers＋Railway fallback）。

### スケーラビリティ
- RedisとPostgreSQLを分離。
- APIはStateless化（Session非保持）。

### メンテナンス性
- コードスタイル統一（Black, ESLint, Prettier）。
- FastAPI自動ドキュメント（/docs）を利用。
- 型定義必須（Python: typing / TypeScript）。

### ログ・監視
- Sentryでエラー追跡。
- PostHogで行動分析。
- API・ジョブごとに構造化ログ（JSON）出力。

### テスト
- 単体テスト（pytest）と統合テスト（FastAPI TestClient）。
- CI上で自動実行。

---

## 🔧 運用ガイドライン

- Supabase Authの新規ユーザー作成／プロフィール更新時には、Supabase FunctionまたはCronジョブでアプリ側`users`テーブルへ`id`/`email`/表示名を同期する（サービスロールキー利用、重複メール禁止）。
- DBスキーマ変更はAlembicマイグレーションで管理し、ステージング → 本番の順に適用する。

---

## 🧱 データモデル（概要）

| エンティティ | 主なフィールド | 説明 |
|--------------|----------------|------|
| users | id, name, email, created_at | Supabase Authのプロフィールと同期 |
| themes | id, text, category, date | 上の句（お題） |
| works | id, user_id, theme_id, text, created_at | ユーザーの下の句投稿 |
| likes | id, user_id, work_id, created_at | 共鳴（いいね） |
| rankings | id, theme_id, work_id, score, snapshot_time | 22:00スナップショット |
| sponsors | id, company_name, text, category, target_regions, target_age_min, target_age_max, budget | スポンサーお題 |

---

## 🔄 日次スケジュール（ワークフロー）

| 時刻 | 処理内容 | 実行方式 |
|------|-----------|-----------|
| 21:00（前日） | 上の句生成（AI） | Cloudflare Worker |
| 06:00 | お題配信・通知 | Expo Push |
| 06:00〜21:59 | 投稿・鑑賞・いいね | ユーザー操作 |
| 22:00 | ランキング確定 | Cronジョブ |
| 22:00〜翌06:00 | 結果閲覧 | Read‑only mode |

---

## 🧩 外部サービス／依存関係

| 項目 | サービス | 用途 |
|------|-----------|------|
| 認証 | Supabase Auth | ログイン・日次制限 |
| データベース | PostgreSQL (Neon/Supabase) | 永続化 |
| キャッシュ | Upstash Redis | スコア・ランキング |
| ストレージ | Cloudflare R2 | 画像・スナップショット |
| ジョブ | Cloudflare Workers / Railway | 定時処理 |
| Push通知 | Expo Push API | 配信通知 |
| 監視 | Sentry, PostHog | 障害検知・行動分析 |

---

## 📈 MVP成功指標（KPI）
- 日次投稿率：50%以上  
- 1日平均共鳴数：3件／作品  
- 平均滞在時間：3分以上  
- スポンサー利用率：10%以上

---

## 🚀 今後の拡張構想
- 「詠友」フォロー機能  
- 詩のテーマ別アーカイブ  
- AIとの共作モード（句の続きを提案）  
- イベント開催機能（祭・月例コンテスト）

---

_この要件定義書は、Codexおよび開発者が同一の理解を共有するための指針である。_
