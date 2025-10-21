# ランキング確定ジョブ設計メモ

## 目的
- 22:00 JST 時点の作品ランキングを Redis から PostgreSQL (`rankings` テーブル) へスナップショットとして保存する。
- 保存と同時にユーザー通知（Push / メール）へ連携できるイベントを発火する。
- 投稿受付終了後の最終結果として参照されるデータを保証する。

## 実行タイミングと環境
- **Cron**: 22:00 JST（UTC 換算で 13:00）
- **実行環境**: Railway / Cloudflare Workers（Node 版 Cron） / GitHub Actions Scheduled のいずれか  
  *推奨*: 同じ環境で 06:00 の配信ジョブも管理すると監視が簡潔になる。

## 前提
- Redis キー: `rankings:{theme_id}` に ZSET でリアルタイムスコアが格納されている。
- メトリクス: `metrics:{work_id}` ハッシュに likes / impressions / unique_viewers を保存済み。
- 該当日のテーマ情報は `themes` に存在し、投稿受付を停止済み。

## 処理フロー
1. **対象テーマの抽出**  
   - `themes` テーブルから、本日分 (`date = current_date in JST`) の ID を取得。  
   - `sponsored` などの属性がある場合は補助情報として保持。

2. **ランキング候補の取得**  
   - Redis ZSET から上位 N 件（例: 100）を `zrevrange` で取得。  
   - 作品が存在しない場合はスナップショットをスキップし、警告ログ。
   - 取得した作品 ID ごとにメトリクスハッシュを `hmget`、Wilson 下限スコアを再計算（再現性確保のため）。

3. **DB への書き込み**  
   - 既存の `rankings` レコードを該当テーマで削除し、新しいスナップショットを一括挿入。  
   - `score` と `rank` を保存（Wilson スコアの結果、小数 5 桁）。  
   - 失敗時はトランザクションをロールバックし、Sentry へ例外送信。

4. **後処理**  
   - Redis ZSET / metrics を削除するか、翌日 06:00 まで残すかは要件次第（現状は翌日まで残して分析可能にする）。  
   - PostHog へ「ranking_finalized」イベントを送出。  
   - Expo Push 用キューに「結果確定」トリガーを投入。

5. **監視**  
   - 処理件数、実行時間、例外を Sentry / Metrics に記録。  
   - 直近成功時刻を Redis や DB に保存し、Health Check エンドポイントで参照できるようにする。

## API / サービスとの連携
- FastAPI 側に `/api/v1/ranking` が存在し、Redis にデータが無い場合 `rankings` テーブルを参照する設計のため、ジョブ成功後は API から即時利用可能。
- 必要であれば内部 API (`/api/v1/internal/ranking/finalize`) を設け、Service Role JWT で保護したうえで同ロジックを呼び出せるようにする。

## テスト戦略
- **ユニットテスト**: Wilson スコア計算、Redis からのデータ抽出、DB への書き込みをモックで検証。
- **統合テスト**: fakeredis + SQLite を用いて、ジョブを実行 → API がスナップショットを参照する流れを再現。
- **リグレッション**: テーマが存在しないケース、Redis が空のケース、DB エラーのケースを網羅。

## 未決定事項
- スナップショット対象件数の上限（例: 上位 100 件 / 全件）
- 22:00 時点で未投稿の場合の扱い（ランキングが存在しない場合の通知）
- 既存ユーザーへの通知チャネル（Push / メール）の優先度
- 過去スナップショットの保持期間（無制限 / 90 日など）

## 今後のタスク
- サービス層 (`app/services/ranking.py`) に Wilson スコア計算ロジックがあるので、ジョブ用のモジュールを共通化。
- Alembic マイグレーションで `rankings` テーブルの古いデータをクリーンアップするルールを検討。
- インフラ側でのシークレット管理（Redis URL / Supabase Service Role）手法を決定。
