"""
X(Twitter)へお題を自動投稿するスクリプト
毎朝6時にGitHub Actionsから実行される
"""

import os
import sys
import logging
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Optional
import requests
from requests_oauthlib import OAuth1

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
    """X(Twitter) API v2クライアント"""

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
        self.auth = OAuth1(
            consumer_key,
            consumer_secret,
            access_token,
            access_token_secret,
        )
        self.base_url = "https://api.twitter.com/2"
        self.upload_url = "https://upload.twitter.com/1.1"

    def upload_media(self, image_bytes: bytes) -> Optional[str]:
        """
        画像をアップロードしてmedia_idを取得

        Args:
            image_bytes: 画像のバイトデータ

        Returns:
            media_id: アップロード成功時のメディアID
        """
        try:
            url = f"{self.upload_url}/media/upload.json"
            files = {"media": image_bytes}
            response = requests.post(url, auth=self.auth, files=files, timeout=30)
            response.raise_for_status()
            media_id = response.json().get("media_id_string")
            logger.info(f"Media uploaded successfully: {media_id}")
            return media_id
        except requests.exceptions.HTTPError as e:
            logger.error(f"Failed to upload media: {e}")
            if hasattr(e, 'response') and e.response is not None:
                logger.error(f"Response status: {e.response.status_code}")
                logger.error(f"Response headers: {dict(e.response.headers)}")
                logger.error(f"Response body: {e.response.text}")
            return None
        except Exception as e:
            logger.error(f"Failed to upload media: {e}")
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
            url = f"{self.base_url}/tweets"
            payload = {"text": text}

            if media_ids:
                payload["media"] = {"media_ids": media_ids}

            response = requests.post(url, auth=self.auth, json=payload, timeout=30)
            response.raise_for_status()
            tweet_data = response.json()
            logger.info(f"Tweet posted successfully: {tweet_data}")
            return True
        except Exception as e:
            logger.error(f"Failed to post tweet: {e}")
            if hasattr(e, 'response') and e.response is not None:
                logger.error(f"Response: {e.response.text}")
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
    # カテゴリラベルと絵文字
    category_info = {
        "romance": {"label": "恋愛", "emoji": "💕", "hashtag": "#恋愛"},
        "season": {"label": "季節", "emoji": "🍃", "hashtag": "#季節"},
        "daily": {"label": "日常", "emoji": "☕", "hashtag": "#日常"},
        "humor": {"label": "ユーモア", "emoji": "😄", "hashtag": "#ユーモア"},
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

    # App Store URL
    app_store_url = "https://apps.apple.com/jp/app/%E3%82%88%E3%81%BF%E3%81%B3%E3%82%88%E3%82%8A/id6754638890"

    # カテゴリごとの投稿文（お題テキストは画像に含まれているため省略）
    category_messages = {
        "romance": f"""💕 {date_str}のお題【恋愛】

胸がときめく恋の一首を詠んでみませんか？
よみびよりアプリで下の句を投稿しよう！

{app_store_url}

#よみびより #短歌 #詩 #恋愛""",

        "season": f"""🍃 {date_str}のお題【季節】

季節の移ろいを感じる一首を詠んでみませんか？
よみびよりアプリで下の句を投稿しよう！

{app_store_url}

#よみびより #短歌 #詩 #季節""",

        "daily": f"""☕ {date_str}のお題【日常】

何気ない日々の中にある美しさを詠んでみませんか？
よみびよりアプリで下の句を投稿しよう！

{app_store_url}

#よみびより #短歌 #詩 #日常""",

        "humor": f"""😄 {date_str}のお題【ユーモア】

クスッと笑える一首を詠んでみませんか？
よみびよりアプリで下の句を投稿しよう！

{app_store_url}

#よみびより #短歌 #詩 #ユーモア""",
    }

    # カテゴリに応じた投稿文を返す（デフォルトは汎用的な文章）
    tweet_text = category_messages.get(
        theme.category,
        f"""🌸 {date_str}のお題【{category_label}】

よみびよりアプリで下の句を詠んでみませんか？

{app_store_url}

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

    # カテゴリラベル
    category_labels = {
        "romance": "恋愛",
        "season": "季節",
        "daily": "日常",
        "humor": "ユーモア",
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

    # 各カテゴリのお題を投稿
    jst = timezone(timedelta(hours=9))
    posted_count = 0
    failed_count = 0

    for theme in themes:
        logger.info(f"Processing theme: {theme.id} - Category: {theme.category}")

        category_label = category_labels.get(theme.category, theme.category)
        # theme.dateがdate型の場合、datetime型に変換
        if isinstance(theme.date, datetime):
            date_jst = theme.date.astimezone(jst)
        else:
            date_jst = datetime.combine(theme.date, datetime.min.time()).replace(tzinfo=jst)
        date_label = date_jst.strftime("%Y/%m/%d")

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
            failed_count += 1
            continue

        # 画像をアップロード
        media_id = client.upload_media(image_bytes)
        if not media_id:
            logger.error(f"Failed to upload image for {theme.category}")
            failed_count += 1
            continue

        # ツイート本文を生成
        tweet_text = generate_tweet_text(theme)
        logger.info(f"Tweet text for {theme.category}:\n{tweet_text}")

        # ツイートを投稿
        success = client.post_tweet(tweet_text, media_ids=[media_id])
        if success:
            logger.info(f"Successfully posted theme for {theme.category}")
            posted_count += 1
        else:
            logger.error(f"Failed to post tweet for {theme.category}")
            failed_count += 1

        # レート制限対策: 各投稿間に少し待機
        if theme != themes[-1]:  # 最後のテーマでなければ待機
            import time
            time.sleep(2)  # 2秒待機

    # 結果をログ
    logger.info(f"Posting completed. Posted: {posted_count}, Failed: {failed_count}")

    if posted_count == 0:
        logger.error("All posts failed")
        sys.exit(1)
    elif failed_count > 0:
        logger.warning(f"Some posts failed ({failed_count} failures)")
        sys.exit(0)  # 一部成功したので正常終了
    else:
        logger.info("All themes posted successfully!")
        sys.exit(0)


if __name__ == "__main__":
    main()
