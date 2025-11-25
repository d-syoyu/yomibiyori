"""
Threadsトークンを初期登録するスクリプト

使用方法:
    python scripts/setup_threads_token.py --token YOUR_ACCESS_TOKEN --user-id YOUR_USER_ID --expires-in 5184000

    --token: 長期アクセストークン
    --user-id: ThreadsユーザーID
    --expires-in: トークンの有効期限（秒）。デフォルト5184000（60日）
"""

import argparse
import sys
import logging
from datetime import datetime, timezone, timedelta
from pathlib import Path

# プロジェクトルートをパスに追加
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from sqlalchemy import select
from app.db.session import SessionLocal
from app.models.api_token import ApiToken

# ロギング設定
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

TOKEN_ID = "threads"


def setup_token(access_token: str, user_id: str, expires_in_seconds: int) -> bool:
    """
    トークンをDBに保存

    Args:
        access_token: アクセストークン
        user_id: ThreadsユーザーID
        expires_in_seconds: 有効期限（秒）

    Returns:
        成功したかどうか
    """
    db = SessionLocal()
    try:
        # 既存のトークンを確認
        result = db.execute(
            select(ApiToken).where(ApiToken.id == TOKEN_ID)
        )
        token = result.scalar_one_or_none()

        expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_in_seconds)

        if token:
            logger.info("Updating existing token...")
            token.access_token = access_token
            token.user_id = user_id
            token.expires_at = expires_at
        else:
            logger.info("Creating new token...")
            token = ApiToken(
                id=TOKEN_ID,
                access_token=access_token,
                user_id=user_id,
                expires_at=expires_at,
            )
            db.add(token)

        db.commit()
        logger.info(f"Token saved successfully!")
        logger.info(f"  ID: {TOKEN_ID}")
        logger.info(f"  User ID: {user_id}")
        logger.info(f"  Expires at: {expires_at}")
        logger.info(f"  Days until expiry: {expires_in_seconds // 86400}")
        return True

    except Exception as e:
        logger.error(f"Failed to save token: {e}")
        db.rollback()
        return False
    finally:
        db.close()


def show_current_token():
    """現在のトークン情報を表示"""
    db = SessionLocal()
    try:
        result = db.execute(
            select(ApiToken).where(ApiToken.id == TOKEN_ID)
        )
        token = result.scalar_one_or_none()

        if token:
            now = datetime.now(timezone.utc)
            expires_at = token.expires_at
            if expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)

            days_until_expiry = (expires_at - now).days

            logger.info("Current token info:")
            logger.info(f"  ID: {token.id}")
            logger.info(f"  User ID: {token.user_id}")
            logger.info(f"  Token (first 20 chars): {token.access_token[:20]}...")
            logger.info(f"  Expires at: {expires_at}")
            logger.info(f"  Days until expiry: {days_until_expiry}")
            logger.info(f"  Created at: {token.created_at}")
            logger.info(f"  Updated at: {token.updated_at}")
        else:
            logger.info("No token found in database")

    finally:
        db.close()


def main():
    parser = argparse.ArgumentParser(description="Setup Threads access token in database")
    parser.add_argument("--token", "-t", help="Access token")
    parser.add_argument("--user-id", "-u", help="Threads user ID")
    parser.add_argument(
        "--expires-in", "-e",
        type=int,
        default=5184000,
        help="Token expiry in seconds (default: 5184000 = 60 days)"
    )
    parser.add_argument("--show", "-s", action="store_true", help="Show current token info")

    args = parser.parse_args()

    if args.show:
        show_current_token()
        return

    if not args.token or not args.user_id:
        logger.error("Both --token and --user-id are required")
        logger.info("Usage: python scripts/setup_threads_token.py --token YOUR_TOKEN --user-id YOUR_USER_ID")
        logger.info("       python scripts/setup_threads_token.py --show  # Show current token")
        sys.exit(1)

    success = setup_token(args.token, args.user_id, args.expires_in)
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
