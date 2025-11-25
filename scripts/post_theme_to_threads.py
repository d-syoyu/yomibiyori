"""
Threadsへお題を自動投稿するスクリプト
毎朝6時にGitHub Actionsから実行される
"""

import os
import sys
import logging
import time
import uuid
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Optional

import requests

# プロジェクトルートをパスに追加
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from sqlalchemy import select
from app.db.session import SessionLocal
from app.models.theme import Theme
from app.utils.theme_card_generator import ThemeCardGenerator

# ロギング設定
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class SupabaseStorageClient:
    """Supabase Storage クライアント（画像の一時アップロード用）"""

    BUCKET_NAME = "theme-cards"

    def __init__(self, supabase_url: str, service_role_key: str):
        self.supabase_url = supabase_url.rstrip("/")
        self.service_role_key = service_role_key
        self.storage_url = f"{self.supabase_url}/storage/v1"

    def _get_headers(self, content_type: str = "application/json") -> dict:
        return {
            "Authorization": f"Bearer {self.service_role_key}",
            "apikey": self.service_role_key,
            "Content-Type": content_type,
        }

    def ensure_bucket_exists(self) -> bool:
        """バケットが存在することを確認し、なければ作成"""
        try:
            # バケット一覧を取得
            response = requests.get(
                f"{self.storage_url}/bucket",
                headers=self._get_headers(),
                timeout=10,
            )

            if response.status_code == 200:
                buckets = response.json()
                bucket_names = [b.get("name") for b in buckets]
                if self.BUCKET_NAME in bucket_names:
                    logger.info(f"Bucket '{self.BUCKET_NAME}' already exists")
                    return True

            # バケットを作成
            create_response = requests.post(
                f"{self.storage_url}/bucket",
                headers=self._get_headers(),
                json={
                    "id": self.BUCKET_NAME,
                    "name": self.BUCKET_NAME,
                    "public": True,
                },
                timeout=10,
            )

            if create_response.status_code in (200, 201):
                logger.info(f"Bucket '{self.BUCKET_NAME}' created successfully")
                return True
            elif "already exists" in create_response.text.lower():
                logger.info(f"Bucket '{self.BUCKET_NAME}' already exists")
                return True
            else:
                logger.error(f"Failed to create bucket: {create_response.text}")
                return False

        except Exception as e:
            logger.error(f"Error ensuring bucket exists: {e}")
            return False

    def upload_image(self, image_bytes: bytes, filename: str) -> Optional[str]:
        """
        画像をアップロードして公開URLを返す

        Args:
            image_bytes: 画像のバイトデータ
            filename: ファイル名

        Returns:
            公開URL（失敗時はNone）
        """
        try:
            # バケットの存在確認
            if not self.ensure_bucket_exists():
                return None

            # ファイルをアップロード
            upload_url = f"{self.storage_url}/object/{self.BUCKET_NAME}/{filename}"

            response = requests.post(
                upload_url,
                headers={
                    "Authorization": f"Bearer {self.service_role_key}",
                    "apikey": self.service_role_key,
                    "Content-Type": "image/png",
                    "x-upsert": "true",  # 同名ファイルがあれば上書き
                },
                data=image_bytes,
                timeout=30,
            )

            if response.status_code in (200, 201):
                # 公開URLを構築
                public_url = f"{self.supabase_url}/storage/v1/object/public/{self.BUCKET_NAME}/{filename}"
                logger.info(f"Image uploaded successfully: {public_url}")
                return public_url
            else:
                logger.error(f"Failed to upload image: {response.status_code} - {response.text}")
                return None

        except Exception as e:
            logger.error(f"Error uploading image: {e}")
            return None

    def delete_image(self, filename: str) -> bool:
        """画像を削除"""
        try:
            delete_url = f"{self.storage_url}/object/{self.BUCKET_NAME}/{filename}"
            response = requests.delete(
                delete_url,
                headers=self._get_headers(),
                timeout=10,
            )
            return response.status_code in (200, 204)
        except Exception as e:
            logger.error(f"Error deleting image: {e}")
            return False


class ThreadsAPIClient:
    """Threads API クライアント"""

    BASE_URL = "https://graph.threads.net/v1.0"

    def __init__(self, user_id: str, access_token: str):
        self.user_id = user_id
        self.access_token = access_token

    def create_image_container(self, image_url: str, text: str) -> Optional[str]:
        """
        画像付きメディアコンテナを作成

        Args:
            image_url: 公開画像URL
            text: 投稿テキスト

        Returns:
            creation_id（失敗時はNone）
        """
        try:
            url = f"{self.BASE_URL}/{self.user_id}/threads"
            params = {
                "media_type": "IMAGE",
                "image_url": image_url,
                "text": text,
                "access_token": self.access_token,
            }

            response = requests.post(url, params=params, timeout=30)

            if response.status_code == 200:
                data = response.json()
                creation_id = data.get("id")
                logger.info(f"Media container created: {creation_id}")
                return creation_id
            else:
                logger.error(f"Failed to create media container: {response.status_code} - {response.text}")
                return None

        except Exception as e:
            logger.error(f"Error creating media container: {e}")
            return None

    def publish_container(self, creation_id: str) -> bool:
        """
        メディアコンテナを公開

        Args:
            creation_id: メディアコンテナID

        Returns:
            成功したかどうか
        """
        try:
            url = f"{self.BASE_URL}/{self.user_id}/threads_publish"
            params = {
                "creation_id": creation_id,
                "access_token": self.access_token,
            }

            response = requests.post(url, params=params, timeout=30)

            if response.status_code == 200:
                data = response.json()
                post_id = data.get("id")
                logger.info(f"Post published successfully: {post_id}")
                return True
            else:
                logger.error(f"Failed to publish post: {response.status_code} - {response.text}")
                return False

        except Exception as e:
            logger.error(f"Error publishing post: {e}")
            return False

    def post_with_image(self, image_url: str, text: str) -> bool:
        """
        画像付き投稿を行う（2ステップを統合）

        Args:
            image_url: 公開画像URL
            text: 投稿テキスト

        Returns:
            成功したかどうか
        """
        # Step 1: メディアコンテナを作成
        creation_id = self.create_image_container(image_url, text)
        if not creation_id:
            return False

        # 処理待ち（Threads側で画像をダウンロード・処理する時間）
        logger.info("Waiting for media processing...")
        time.sleep(10)

        # Step 2: 公開
        return self.publish_container(creation_id)


def get_today_themes() -> list[Theme]:
    """今日の全カテゴリのお題を取得"""
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


def generate_post_text(theme: Theme) -> str:
    """投稿本文を生成（カテゴリごとに異なる内容）"""
    category_info = {
        "romance": {"label": "恋愛", "emoji": "💕"},
        "season": {"label": "季節", "emoji": "🍃"},
        "daily": {"label": "日常", "emoji": "☕"},
        "humor": {"label": "ユーモア", "emoji": "😄"},
    }

    info = category_info.get(theme.category, {"label": theme.category, "emoji": "📖"})
    emoji = info["emoji"]

    # 日付フォーマット
    jst = timezone(timedelta(hours=9))
    if isinstance(theme.date, datetime):
        date_jst = theme.date.astimezone(jst)
    else:
        date_jst = datetime.combine(theme.date, datetime.min.time()).replace(tzinfo=jst)
    date_str = date_jst.strftime("%Y年%m月%d日")

    # スポンサー情報
    sponsor_suffix = ""
    if theme.sponsored and theme.sponsor_company_name:
        sponsor_suffix = f" (提供: {theme.sponsor_company_name}様)"

    # App Store URL
    app_store_url = "https://apps.apple.com/jp/app/%E3%82%88%E3%81%BF%E3%81%B3%E3%82%88%E3%82%8A/id6754638890"

    # カテゴリごとの投稿文
    category_messages = {
        "romance": f"""💕 {date_str}のお題【恋愛】{sponsor_suffix}

胸がときめく恋の一首を詠んでみませんか？
よみびよりアプリで下の句を投稿しよう！

{app_store_url}

#よみびより #短歌 #詩 #恋愛""",

        "season": f"""🍃 {date_str}のお題【季節】{sponsor_suffix}

季節の移ろいを感じる一首を詠んでみませんか？
よみびよりアプリで下の句を投稿しよう！

{app_store_url}

#よみびより #短歌 #詩 #季節""",

        "daily": f"""☕ {date_str}のお題【日常】{sponsor_suffix}

何気ない日々の中にある美しさを詠んでみませんか？
よみびよりアプリで下の句を投稿しよう！

{app_store_url}

#よみびより #短歌 #詩 #日常""",

        "humor": f"""😄 {date_str}のお題【ユーモア】{sponsor_suffix}

クスッと笑える一首を詠んでみませんか？
よみびよりアプリで下の句を投稿しよう！

{app_store_url}

#よみびより #短歌 #詩 #ユーモア""",
    }

    category_label = info["label"]
    return category_messages.get(
        theme.category,
        f"""🌸 {date_str}のお題【{category_label}】{sponsor_suffix}

よみびよりアプリで下の句を詠んでみませんか？

{app_store_url}

#よみびより #短歌 #詩"""
    )


def main():
    """メイン処理"""
    logger.info("Starting post_theme_to_threads script")

    # 環境変数から認証情報を取得
    threads_user_id = os.getenv("THREADS_USER_ID")
    threads_access_token = os.getenv("THREADS_ACCESS_TOKEN")
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_service_role_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

    # Threads認証情報のチェック
    if not threads_user_id or not threads_access_token:
        logger.error("Missing Threads API credentials")
        logger.error("Required: THREADS_USER_ID, THREADS_ACCESS_TOKEN")
        sys.exit(1)

    # Supabase認証情報のチェック
    if not supabase_url or not supabase_service_role_key:
        logger.error("Missing Supabase credentials for image upload")
        logger.error("Required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY")
        sys.exit(1)

    # 認証情報の一部をログ（デバッグ用）
    logger.info(f"THREADS_USER_ID: {threads_user_id[:10]}..." if len(threads_user_id) > 10 else threads_user_id)
    logger.info(f"THREADS_ACCESS_TOKEN: {threads_access_token[:10]}...")
    logger.info(f"SUPABASE_URL: {supabase_url}")

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

    # クライアントを初期化
    threads_client = ThreadsAPIClient(
        user_id=threads_user_id,
        access_token=threads_access_token,
    )
    storage_client = SupabaseStorageClient(
        supabase_url=supabase_url,
        service_role_key=supabase_service_role_key,
    )
    generator = ThemeCardGenerator()

    # 各カテゴリのお題を投稿
    jst = timezone(timedelta(hours=9))
    posted_count = 0
    failed_count = 0
    uploaded_files = []  # クリーンアップ用

    try:
        for theme in themes:
            logger.info(f"Processing theme: {theme.id} - Category: {theme.category}")

            category_label = category_labels.get(theme.category, theme.category)
            if isinstance(theme.date, datetime):
                date_jst = theme.date.astimezone(jst)
            else:
                date_jst = datetime.combine(theme.date, datetime.min.time()).replace(tzinfo=jst)
            date_label = date_jst.strftime("%Y/%m/%d")

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
                failed_count += 1
                continue

            # 画像をSupabase Storageにアップロード
            filename = f"threads_{theme.category}_{uuid.uuid4().hex[:8]}.png"
            image_url = storage_client.upload_image(image_bytes, filename)
            if not image_url:
                logger.error(f"Failed to upload image for {theme.category}")
                failed_count += 1
                continue
            uploaded_files.append(filename)

            # 投稿本文を生成
            post_text = generate_post_text(theme)
            logger.info(f"Post text for {theme.category}:\n{post_text}")

            # Threadsに投稿
            success = threads_client.post_with_image(image_url, post_text)
            if success:
                logger.info(f"Successfully posted theme for {theme.category}")
                posted_count += 1
            else:
                logger.error(f"Failed to post to Threads for {theme.category}")
                failed_count += 1

            # レート制限対策: 各投稿間に待機
            if theme != themes[-1]:
                logger.info("Waiting before next post...")
                time.sleep(5)

    finally:
        # アップロードした画像を削除（クリーンアップ）
        logger.info("Cleaning up uploaded images...")
        for filename in uploaded_files:
            storage_client.delete_image(filename)

    # 結果をログ
    logger.info(f"Posting completed. Posted: {posted_count}, Failed: {failed_count}")

    if posted_count == 0:
        logger.error("All posts failed")
        sys.exit(1)
    elif failed_count > 0:
        logger.warning(f"Some posts failed ({failed_count} failures)")
        sys.exit(0)
    else:
        logger.info("All themes posted successfully!")
        sys.exit(0)


if __name__ == "__main__":
    main()
