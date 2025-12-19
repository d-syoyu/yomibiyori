"""
X(Twitter)へお題を自動投稿するスクリプト
毎朝6時にGitHub Actionsから実行される
"""

import os
import sys
import logging
import json
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Optional
import tweepy


# 曜日→カテゴリのスケジュール（デフォルト設定）
# 0=月曜, 1=火曜, ..., 6=日曜
# カテゴリ名はDBに保存されている日本語名を使用
DEFAULT_WEEKDAY_CATEGORY_SCHEDULE = {
    0: "恋愛",     # 月曜: 恋愛
    1: "季節",     # 火曜: 季節
    2: "日常",     # 水曜: 日常
    3: "恋愛",     # 木曜: 恋愛
    4: "日常",     # 金曜: 日常
    5: "ユーモア",  # 土曜: ユーモア
    6: "ユーモア",  # 日曜: ユーモア
}


def get_weekday_category_schedule() -> dict[int, str]:
    """
    曜日→カテゴリのスケジュールを取得
    環境変数 X_POST_CATEGORY_SCHEDULE でJSON形式でオーバーライド可能

    Returns:
        曜日(0-6) → カテゴリ名のマッピング
    """
    schedule_json = os.getenv("X_POST_CATEGORY_SCHEDULE")
    if schedule_json:
        try:
            custom_schedule = json.loads(schedule_json)
            # キーを整数に変換
            return {int(k): v for k, v in custom_schedule.items()}
        except (json.JSONDecodeError, ValueError) as e:
            logging.getLogger(__name__).warning(
                f"Invalid X_POST_CATEGORY_SCHEDULE format, using default: {e}"
            )
    return DEFAULT_WEEKDAY_CATEGORY_SCHEDULE.copy()


def get_category_for_today() -> str:
    """
    JSTで今日の曜日に基づくカテゴリを返す

    Returns:
        今日投稿すべきカテゴリ名
    """
    jst = timezone(timedelta(hours=9))
    weekday = datetime.now(jst).weekday()  # 0=月曜, 6=日曜
    schedule = get_weekday_category_schedule()
    return schedule[weekday]

# プロジェクトルートをパスに追加
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from sqlalchemy import select, desc
from app.db.session import SessionLocal
from app.models.theme import Theme
from app.utils.theme_card_generator import ThemeCardGenerator

# ロギング設定
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class XAPIClient:
    """X(Twitter) API v2クライアント（tweepy使用）"""

    def __init__(
        self,
        consumer_key: str,
        consumer_secret: str,
        access_token: str,
        access_token_secret: str,
    ):
        """
        Args:
            consumer_key: API Key
            consumer_secret: API Secret Key
            access_token: Access Token
            access_token_secret: Access Token Secret
        """
        # OAuth 1.0a認証（v1.1 APIとv2 API両方で使用）
        self.auth = tweepy.OAuth1UserHandler(
            consumer_key,
            consumer_secret,
            access_token,
            access_token_secret,
        )

        # API v1.1クライアント（メディアアップロード用）
        self.api_v1 = tweepy.API(self.auth)

        # API v2クライアント（ツイート投稿用）
        self.client = tweepy.Client(
            consumer_key=consumer_key,
            consumer_secret=consumer_secret,
            access_token=access_token,
            access_token_secret=access_token_secret,
        )

    def upload_media(self, image_bytes: bytes) -> Optional[str]:
        """
        画像をアップロードしてmedia_idを取得

        Args:
            image_bytes: 画像のバイトデータ

        Returns:
            media_id: アップロード成功時のメディアID
        """
        try:
            # 一時ファイルに保存してアップロード
            import tempfile
            with tempfile.NamedTemporaryFile(delete=False, suffix='.png') as tmp_file:
                tmp_file.write(image_bytes)
                tmp_file_path = tmp_file.name

            try:
                # API v1.1でメディアアップロード
                media = self.api_v1.media_upload(tmp_file_path)
                media_id = media.media_id_string
                logger.info(f"Media uploaded successfully: {media_id}")
                return media_id
            finally:
                # 一時ファイルを削除
                import os as os_module
                os_module.unlink(tmp_file_path)

        except Exception as e:
            logger.error(f"Failed to upload media: {e}")
            if hasattr(e, 'response') and e.response is not None:
                logger.error(f"Response: {e.response}")
            return None

    def post_tweet(self, text: str, media_ids: Optional[list[str]] = None) -> bool:
        """
        ツイートを投稿

        Args:
            text: ツイート本文
            media_ids: 添付メディアIDリスト

        Returns:
            成功したかどうか
        """
        try:
            # API v2でツイート投稿
            response = self.client.create_tweet(
                text=text,
                media_ids=media_ids
            )
            logger.info(f"Tweet posted successfully: {response.data}")
            return True
        except Exception as e:
            logger.error(f"Failed to post tweet: {e}")
            if hasattr(e, 'response') and e.response is not None:
                logger.error(f"Response: {e.response}")
            return False


def get_today_themes() -> list[Theme]:
    """
    今日の全カテゴリのお題を取得

    Returns:
        今日のThemeリスト
    """
    jst = timezone(timedelta(hours=9))
    now_jst = datetime.now(jst)
    today_start = now_jst.replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = now_jst.replace(hour=23, minute=59, second=59, microsecond=999999)

    db = SessionLocal()
    try:
        result = db.execute(
            select(Theme)
            .where(Theme.date >= today_start)
            .where(Theme.date <= today_end)
            .order_by(Theme.category)
        )
        themes = result.scalars().all()
        return themes
    finally:
        db.close()


def generate_tweet_text(theme: Theme) -> str:
    """
    ツイート本文を生成（カテゴリごとに異なる内容）

    Args:
        theme: お題オブジェクト

    Returns:
        ツイート本文
    """
    # カテゴリラベルと絵文字（日本語カテゴリ名をキーとして使用）
    category_info = {
        "恋愛": {"label": "恋愛", "emoji": "💕", "hashtag": "#恋愛"},
        "季節": {"label": "季節", "emoji": "🍃", "hashtag": "#季節"},
        "日常": {"label": "日常", "emoji": "☕", "hashtag": "#日常"},
        "ユーモア": {"label": "ユーモア", "emoji": "😄", "hashtag": "#ユーモア"},
    }

    info = category_info.get(theme.category, {"label": theme.category, "emoji": "📖", "hashtag": ""})
    category_label = info["label"]
    emoji = info["emoji"]
    category_hashtag = info["hashtag"]

    # 日付フォーマット
    jst = timezone(timedelta(hours=9))
    # theme.dateがdate型の場合、datetime型に変換
    if isinstance(theme.date, datetime):
        date_jst = theme.date.astimezone(jst)
    else:
        # date型をdatetime型に変換してからタイムゾーン設定
        date_jst = datetime.combine(theme.date, datetime.min.time()).replace(tzinfo=jst)
    date_str = date_jst.strftime("%Y年%m月%d日")

    # スポンサー情報
    sponsor_suffix = ""
    if theme.sponsored and theme.sponsor_company_name:
        sponsor_suffix = f" (提供: {theme.sponsor_company_name}様)"

    # ダウンロードページURL
    download_url = "https://yomibiyori.app/download"

    # アプリ誘導文言
    app_promo = "👇ほかのお題もよみびよりアプリで"

    # カテゴリごとの投稿文（日本語カテゴリ名をキーとして使用）
    category_messages = {
        "恋愛": f"""💕 {date_str}のお題【恋愛】{sponsor_suffix}

胸がときめく恋の一首を詠んでみませんか？
よみびよりアプリで下の句を投稿しよう！

{app_promo}
{download_url}

#よみびより #短歌 #詩 #恋愛""",

        "季節": f"""🍃 {date_str}のお題【季節】{sponsor_suffix}

季節の移ろいを感じる一首を詠んでみませんか？
よみびよりアプリで下の句を投稿しよう！

{app_promo}
{download_url}

#よみびより #短歌 #詩 #季節""",

        "日常": f"""☕ {date_str}のお題【日常】{sponsor_suffix}

何気ない日々の中にある美しさを詠んでみませんか？
よみびよりアプリで下の句を投稿しよう！

{app_promo}
{download_url}

#よみびより #短歌 #詩 #日常""",

        "ユーモア": f"""😄 {date_str}のお題【ユーモア】{sponsor_suffix}

クスッと笑える一首を詠んでみませんか？
よみびよりアプリで下の句を投稿しよう！

{app_promo}
{download_url}

#よみびより #短歌 #詩 #ユーモア""",
    }

    # カテゴリに応じた投稿文を返す（デフォルトは汎用的な文章）
    tweet_text = category_messages.get(
        theme.category,
        f"""🌸 {date_str}のお題【{category_label}】{sponsor_suffix}

よみびよりアプリで下の句を詠んでみませんか？

{download_url}

#よみびより #短歌 #詩"""
    )

    return tweet_text


def main():
    """メイン処理"""
    logger.info("Starting post_theme_to_x script")

    # 環境変数から認証情報を取得
    consumer_key = os.getenv("X_API_KEY")
    consumer_secret = os.getenv("X_API_SECRET")
    access_token = os.getenv("X_ACCESS_TOKEN")
    access_token_secret = os.getenv("X_ACCESS_TOKEN_SECRET")

    if not all([consumer_key, consumer_secret, access_token, access_token_secret]):
        logger.error("Missing X API credentials in environment variables")
        logger.error("Required: X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_TOKEN_SECRET")
        sys.exit(1)

    # デバッグ: 認証情報の最初の数文字を表示（セキュリティのため一部のみ）
    logger.info(f"X_API_KEY: {consumer_key[:10]}..." if consumer_key else "None")
    logger.info(f"X_API_SECRET: {consumer_secret[:10]}..." if consumer_secret else "None")
    logger.info(f"X_ACCESS_TOKEN: {access_token[:10]}..." if access_token else "None")
    logger.info(f"X_ACCESS_TOKEN_SECRET: {access_token_secret[:10]}..." if access_token_secret else "None")

    # 今日の全カテゴリのお題を取得
    themes = get_today_themes()
    if not themes:
        logger.error("No themes found for today")
        sys.exit(1)

    logger.info(f"Found {len(themes)} themes for today")

    # 今日投稿すべきカテゴリを取得（曜日ベース）
    target_category = get_category_for_today()
    jst = timezone(timedelta(hours=9))
    weekday_names = ["月", "火", "水", "木", "金", "土", "日"]
    weekday = datetime.now(jst).weekday()
    logger.info(f"Today is {weekday_names[weekday]}曜日, posting category: {target_category}")

    # 該当カテゴリのテーマをフィルタリング
    target_theme = None
    for theme in themes:
        if theme.category == target_category:
            target_theme = theme
            break

    if not target_theme:
        logger.error(f"No theme found for category '{target_category}' today")
        sys.exit(1)

    # カテゴリラベル（日本語カテゴリ名をキーとして使用）
    category_labels = {
        "恋愛": "恋愛",
        "季節": "季節",
        "日常": "日常",
        "ユーモア": "ユーモア",
    }

    # X APIクライアントを初期化
    client = XAPIClient(
        consumer_key=consumer_key,
        consumer_secret=consumer_secret,
        access_token=access_token,
        access_token_secret=access_token_secret,
    )

    # 画像ジェネレーターを初期化
    generator = ThemeCardGenerator()

    # 対象カテゴリのお題を投稿（1件のみ）
    theme = target_theme
    logger.info(f"Processing theme: {theme.id} - Category: {theme.category}")

    category_label = category_labels.get(theme.category, theme.category)
    # theme.dateがdate型の場合、datetime型に変換
    if isinstance(theme.date, datetime):
        date_jst = theme.date.astimezone(jst)
    else:
        date_jst = datetime.combine(theme.date, datetime.min.time()).replace(tzinfo=jst)
    date_label = date_jst.strftime("%Y/%m/%d")

    # スポンサー情報を追加
    if theme.sponsored and theme.sponsor_company_name:
        date_label = f"{date_label} (提供: {theme.sponsor_company_name}様)"

    # お題画像を生成
    try:
        image_bytes_io = generator.generate_theme_card(
            theme_text=theme.text,
            category=theme.category,
            category_label=category_label,
            date_label=date_label,
        )
        image_bytes = image_bytes_io.getvalue()
        logger.info(f"Generated theme card image: {len(image_bytes)} bytes")
    except Exception as e:
        logger.error(f"Failed to generate theme card for {theme.category}: {e}")
        sys.exit(1)

    # 画像をアップロード
    media_id = client.upload_media(image_bytes)
    if not media_id:
        logger.error(f"Failed to upload image for {theme.category}")
        sys.exit(1)

    # ツイート本文を生成
    tweet_text = generate_tweet_text(theme)
    logger.info(f"Tweet text for {theme.category}:\n{tweet_text}")

    # ツイートを投稿
    success = client.post_tweet(tweet_text, media_ids=[media_id])
    if success:
        logger.info(f"Successfully posted theme for {theme.category}")
        sys.exit(0)
    else:
        logger.error(f"Failed to post tweet for {theme.category}")
        sys.exit(1)


if __name__ == "__main__":
    main()
