# お題生成ジョブの実装メモ

## 目的
- 21:00 JST に翌日分のお題を生成し、`themes` テーブルへ保存する。
- 06:00 の配信時までに API から参照可能な状態を作る。

## 実装タスク
1. **サービス層の作成**  
   - `app/services/theme_generation.py` を新設し、以下を提供:
     - `generate_theme(category: str, current_time: datetime)`  
       AI に問い合わせるためのラッパー。インターフェースは AI クライアントを抽象化し、テストではダミーを注入できるようにする。
     - `upsert_theme(session: Session, category: str, date: date, text: str)`  
       既存テーマの重複を避けつつ UPSERT を実行。カテゴリ+date のユニークキーを活用。
     - `generate_all_categories(session: Session, ai_client, target_date: date)`  
       設定されたカテゴリリストをループし、AI 生成→バリデーション→保存を行う。
   - 例外は FastAPI ではなく Sentry ログ出力とリトライに回す。

2. **AI クライアントの抽象化**  
   - `app/services/ai_client.py`（仮称）にインターフェースを定義:
     ```python
     class ThemeAIClient(Protocol):
         def generate(self, *, category: str, target_date: date) -> str: ...
     ```
   - 実装例:
     - OpenAI API を呼び出す `OpenAIThemeClient`
     - 開発時に固定文言を返す `DummyThemeClient`
   - `.env` に API キー（`AI_PROVIDER_API_KEY` など）を追加し、`app/core/config.py` で読み込む。

3. **ジョブエントリポイント**  
   - `scripts/generate_themes.py` のような CLI を追加。  
     - DB セッションを取得し `generate_all_categories` を実行。  
     - 実行結果を標準出力に要約。  
   - 後で Railway/Workers からこの CLI を呼び出す、もしくは FastAPI のバックグラウンドタスクに接続する。

4. **カテゴリ管理**  
   - `app/core/config.py` に `theme_categories: list[str]` を追加し、`.env` でカンマ区切り指定。  
   - テストでは固定リスト（`["general", "nature", ...]`）を使用。

5. **バリデーション**  
   - 生成されたテキストが 3〜140 文字の制約を満たすかチェック。  
   - 不適切表現が疑われる場合はリトライまたは NG ワードフィルタリング。

6. **リトライ戦略**  
   - AI 呼び出し失敗時は指数バックオフ（例: 3 回）で再試行。  
   - すべて失敗した場合はエラーを Sentry へ送り、翌朝管理者が手動で補填できるようにする。

7. **テスト**  
   - fakeredis を使わないので通常の Pytest で十分。  
   - AI クライアントをモックし、UPSERT が期待通り動くかを検証する。

## 備考
- 生成結果は `themes` テーブルのユニーク制約により重複登録が防がれる。  
- Supabase service_role を使う場合は、RLS ポリシーで service_role の書き込み許可を確認すること。
