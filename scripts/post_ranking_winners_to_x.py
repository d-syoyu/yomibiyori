"""
ランキング1位作品をX(Twitter)に自動投稿するスクリプト
毎日22:15(JST)に実行され、本日確定した4カテゴリのランキング1位作品を投稿
"""

import os
import sys
import logging
from datetime import datetime, date
from io import BytesIO
from pathlib import Path
from typing import Optional
import tempfile

import tweepy
from sqlalchemy import select
from sqlalchemy.orm import joinedload

# プロジェクトルートをパスに追加
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from app.db.session import SessionLocal
from app.models import Theme, Ranking, Work, User
from app.core.config import get_settings
from app.utils.share_card_generator import ShareCardGenerator

# ロギング設定
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class XAPIClient:
    """X API クライアント（OAuth 1.0a認証）"""

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
            consumer_secret: API Secret
            access_token: Access Token
            access_token_secret: Access Token Secret
        """
        # OAuth 1.0a認証
        self.auth = tweepy.OAuth1UserHandler(
            consumer_key,
            consumer_secret,
            access_token,
            access_token_secret
        )

        # API v1.1 (media_upload用)
        self.api_v1 = tweepy.API(self.auth)

        # API v2 (create_tweet用)
        self.client = tweepy.Client(
            consumer_key=consumer_key,
            consumer_secret=consumer_secret,
            access_token=access_token,
            access_token_secret=access_token_secret
        )

    def upload_media(self, image_bytes: bytes) -> Optional[str]:
        """
        画像をアップロードしてmedia_idを取得（API v1.1使用）

        Args:
            image_bytes: 画像のバイトデータ

        Returns:
            media_id (文字列) またはNone
        """
        try:
            # 一時ファイルに保存してアップロード
            with tempfile.NamedTemporaryFile(delete=False, suffix='.png') as tmp_file:
                tmp_file.write(image_bytes)
                tmp_file_path = tmp_file.name

            try:
                media = self.api_v1.media_upload(tmp_file_path)
                logger.info(f"Media uploaded successfully: {media.media_id_string}")
                return media.media_id_string
            finally:
                # 一時ファイルを削除
                os.unlink(tmp_file_path)

        except Exception as e:
            logger.error(f"Failed to upload media: {e}")
            return None

    def post_tweet(self, text: str, media_ids: Optional[list[str]] = None) -> bool:
        """
        ツイートを投稿（API v2使用）

        Args:
            text: ツイート本文
            media_ids: 添付するメディアIDのリスト

        Returns:
            成功した場合True、失敗した場合False
        """
        try:
            response = self.client.create_tweet(
                text=text,
                media_ids=media_ids
            )
            logger.info(f"Tweet posted successfully: {response.data}")
            return True
        except Exception as e:
            logger.error(f"Failed to post tweet: {e}")
            return False


def get_today_winners() -> list[tuple[Theme, Work, User]]:
    """
    本日のランキング1位作品を全カテゴリ分取得

    Returns:
        (Theme, Work, User)のタプルのリスト
    """
    db = SessionLocal()
    try:
        settings = get_settings()
        jst = settings.timezone
        today = datetime.now(jst).date()

        # 本日のテーマを全て取得
        themes = db.execute(
            select(Theme).where(Theme.date == today)
        ).scalars().all()

        if not themes:
            logger.warning(f"No themes found for date: {today}")
            return []

        winners = []
        for theme in themes:
            # 各テーマのランキング1位を取得
            ranking = db.execute(
                select(Ranking)
                .where(Ranking.theme_id == theme.id, Ranking.rank == 1)
                .options(
                    joinedload(Ranking.work).joinedload(Work.author)
                )
            ).scalar_one_or_none()

            if ranking and ranking.work and ranking.work.author:
                winners.append((theme, ranking.work, ranking.work.author))
                logger.info(
                    f"Found winner for {theme.category}: "
                    f"work_id={ranking.work.id}, author={ranking.work.author.name}"
                )
            else:
                logger.warning(f"No winner found for theme {theme.id} ({theme.category})")

        return winners

    finally:
        db.close()


def generate_work_image(theme: Theme, work: Work, author: User) -> BytesIO:
    """
    作品の共有画像を生成

    Args:
        theme: テーマ
        work: 作品
        author: 作者

    Returns:
        画像のバイトストリーム
    """
    settings = get_settings()
    jst = settings.timezone

    # カテゴリラベルのマッピング
    category_labels = {
        "romance": "恋愛",
        "season": "季節",
        "daily": "日常",
        "humor": "ユーモア",
    }
    category_label = category_labels.get(theme.category, theme.category)

    # 日付ラベル
    if isinstance(theme.date, datetime):
        date_jst = theme.date.astimezone(jst)
    else:
        date_jst = datetime.combine(theme.date, datetime.min.time()).replace(tzinfo=jst)
    date_label = date_jst.strftime("%Y/%m/%d")

    # 共有カード生成
    generator = ShareCardGenerator()
    image_bytes = generator.generate(
        upper_text=theme.text,
        lower_text=work.text,
        author_name=author.name,
        category=theme.category,
        category_label=category_label,
        date_label=date_label,
    )

    return image_bytes


def generate_tweet_text(theme: Theme, author: User) -> str:
    """
    カテゴリに応じたツイート文言を生成

    Args:
        theme: テーマ
        author: 作者

    Returns:
        ツイート本文
    """
    category_messages = {
        "romance": "💕 本日の恋愛部門、1位作品が決定しました！",
        "season": "🍃 本日の季節部門、1位作品が決定しました！",
        "daily": "☕ 本日の日常部門、1位作品が決定しました！",
        "humor": "😄 本日のユーモア部門、1位作品が決定しました！",
    }

    message = category_messages.get(theme.category, "🏆 本日の1位作品が決定しました！")
    author_name = f"@{author.name}"

    tweet = f"""{message}

作者: {author_name} さん

他の素敵な作品もアプリでチェック！
https://yomibiyori.app/download

#よみびより #短歌 #詩"""

    return tweet


def main() -> int:
    """メイン処理"""
    # 環境変数から認証情報を取得
    consumer_key = os.getenv("X_API_KEY")
    consumer_secret = os.getenv("X_API_SECRET")
    access_token = os.getenv("X_ACCESS_TOKEN")
    access_token_secret = os.getenv("X_ACCESS_TOKEN_SECRET")

    if not all([consumer_key, consumer_secret, access_token, access_token_secret]):
        logger.error("X API credentials not found in environment variables")
        return 1

    logger.info("=== X API Authentication Debug ===")
    logger.info(f"Consumer Key: {consumer_key[:10]}...")
    logger.info(f"Consumer Secret: {consumer_secret[:10]}...")
    logger.info(f"Access Token: {access_token[:10]}...")
    logger.info(f"Access Token Secret: {access_token_secret[:10]}...")

    # X APIクライアント初期化
    client = XAPIClient(
        consumer_key=consumer_key,
        consumer_secret=consumer_secret,
        access_token=access_token,
        access_token_secret=access_token_secret,
    )

    # 本日の1位作品を取得
    winners = get_today_winners()
    if not winners:
        logger.warning("No winners found for today")
        return 0

    # 各カテゴリの1位作品を投稿
    success_count = 0
    for theme, work, author in winners:
        logger.info(f"Processing winner for category: {theme.category}")

        # 画像生成
        try:
            image_bytes_io = generate_work_image(theme, work, author)
            image_bytes = image_bytes_io.getvalue()
            logger.info(f"Generated image for {theme.category} ({len(image_bytes)} bytes)")
        except Exception as e:
            logger.error(f"Failed to generate image for {theme.category}: {e}")
            continue

        # 画像アップロード
        media_id = client.upload_media(image_bytes)
        if not media_id:
            logger.error(f"Failed to upload image for {theme.category}")
            continue

        # ツイート文言生成
        tweet_text = generate_tweet_text(theme, author)
        logger.info(f"Tweet text for {theme.category}:\n{tweet_text}")

        # ツイート投稿
        if client.post_tweet(tweet_text, media_ids=[media_id]):
            success_count += 1
            logger.info(f"Successfully posted tweet for {theme.category}")
        else:
            logger.error(f"Failed to post tweet for {theme.category}")

    logger.info(f"Posted {success_count}/{len(winners)} tweets")
    return 0 if success_count == len(winners) else 1


if __name__ == "__main__":
    sys.exit(main())
