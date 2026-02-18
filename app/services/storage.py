"""Storage service for file uploads (R2 + local fallback)."""

from __future__ import annotations

import io
import logging
import uuid
from pathlib import Path

import boto3
from botocore.exceptions import ClientError
from fastapi import HTTPException, status
from PIL import Image

from app.core.config import get_settings

logger = logging.getLogger(__name__)


# Maximum avatar file size: 5MB
MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024
# Allowed MIME types for avatar uploads
ALLOWED_AVATAR_MIME_TYPES = {"image/jpeg", "image/jpg", "image/png", "image/webp"}
# Avatar will be resized to this maximum dimension
AVATAR_MAX_DIMENSION = 256


class StorageService:
    """Service for managing file uploads to Cloudflare R2 or local filesystem."""

    def __init__(self) -> None:
        settings = get_settings()
        logger.info(f"[StorageService] Initializing with r2_account_id={settings.r2_account_id}")
        logger.info(f"[StorageService] r2_bucket_name={settings.r2_bucket_name}")
        logger.info(f"[StorageService] r2_public_url={settings.r2_public_url!r}")

        # Local upload directory (used as fallback in development)
        self._local_upload_dir = Path(settings.local_upload_dir) / "avatars"
        self._local_upload_base_url = settings.local_upload_base_url

        if not all([settings.r2_account_id, settings.r2_access_key_id, settings.r2_secret_access_key]):
            if settings.app_env == "development":
                logger.info("[StorageService] R2 not configured, using local file storage (development mode)")
                self._local_upload_dir.mkdir(parents=True, exist_ok=True)
            else:
                logger.warning("[StorageService] R2 credentials not configured, storage disabled")
            self._client = None
            self._bucket = None
            self._public_url = None
            return

        self._client = boto3.client(
            "s3",
            endpoint_url=f"https://{settings.r2_account_id}.r2.cloudflarestorage.com",
            aws_access_key_id=settings.r2_access_key_id,
            aws_secret_access_key=settings.r2_secret_access_key,
            region_name="auto",
        )
        self._bucket = settings.r2_bucket_name
        self._public_url = settings.r2_public_url
        logger.info(f"[StorageService] Initialized: bucket={self._bucket}, public_url={self._public_url!r}")

    @property
    def is_configured(self) -> bool:
        """Check if storage is available (R2 or local fallback)."""
        if self._client is not None:
            return True
        settings = get_settings()
        return settings.app_env == "development"

    def upload_avatar(
        self,
        user_id: str,
        file_content: bytes,
        content_type: str,
    ) -> str:
        """Upload and process a user avatar image.

        Args:
            user_id: The user's ID
            file_content: Raw bytes of the uploaded file
            content_type: MIME type of the file

        Returns:
            Public URL of the uploaded avatar

        Raises:
            HTTPException: If upload fails or file is invalid
        """
        if not self.is_configured:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="画像アップロード機能が利用できません",
            )

        # Validate content type
        if content_type not in ALLOWED_AVATAR_MIME_TYPES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="対応している画像形式はJPEG、PNG、WebPのみです",
            )

        # Validate file size
        if len(file_content) > MAX_AVATAR_SIZE_BYTES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="画像サイズは5MB以下にしてください",
            )

        # Process and resize image
        processed_image = self._process_avatar(file_content)

        # Generate unique filename
        unique_suffix = uuid.uuid4().hex[:8]
        filename = f"{user_id}_{unique_suffix}.jpg"

        if self._client is not None:
            return self._upload_to_r2(filename, processed_image)
        else:
            return self._upload_to_local(filename, processed_image)

    def _upload_to_r2(self, filename: str, processed_image: bytes) -> str:
        """Upload to Cloudflare R2 (production)."""
        key = f"avatars/{filename}"
        try:
            self._client.put_object(
                Bucket=self._bucket,
                Key=key,
                Body=processed_image,
                ContentType="image/jpeg",
                CacheControl="public, max-age=31536000",
            )

            if self._public_url:
                url = f"{self._public_url}/{key}"
                logger.info(f"[StorageService] Using configured public_url: {url}")
                return url
            else:
                url = f"https://{self._bucket}.r2.dev/{key}"
                logger.warning(f"[StorageService] Using fallback URL (no R2_PUBLIC_URL configured): {url}")
                return url

        except ClientError as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="画像のアップロードに失敗しました",
            ) from e

    def _upload_to_local(self, filename: str, processed_image: bytes) -> str:
        """Save to local filesystem (development)."""
        self._local_upload_dir.mkdir(parents=True, exist_ok=True)
        file_path = self._local_upload_dir / filename
        file_path.write_bytes(processed_image)
        logger.info(f"[StorageService] Saved avatar locally: {file_path}")
        base_url = self._local_upload_base_url.rstrip("/")
        return f"{base_url}/uploads/avatars/{filename}"

    def _process_avatar(self, file_content: bytes) -> bytes:
        """Process avatar image: resize and convert to JPEG.

        Args:
            file_content: Raw bytes of the image

        Returns:
            Processed image as JPEG bytes
        """
        try:
            with Image.open(io.BytesIO(file_content)) as img:
                # Convert to RGB (in case of PNG with alpha)
                if img.mode in ("RGBA", "P"):
                    img = img.convert("RGB")

                # Resize maintaining aspect ratio
                img.thumbnail((AVATAR_MAX_DIMENSION, AVATAR_MAX_DIMENSION), Image.Resampling.LANCZOS)

                # Save as JPEG
                output = io.BytesIO()
                img.save(output, format="JPEG", quality=85, optimize=True)
                return output.getvalue()

        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="画像の処理に失敗しました。別の画像をお試しください",
            ) from e

    def delete_avatar(self, avatar_url: str) -> None:
        """Delete an avatar from storage.

        Args:
            avatar_url: Full URL of the avatar to delete
        """
        if not avatar_url:
            return

        # Local file deletion
        if "/uploads/avatars/" in avatar_url:
            try:
                filename = avatar_url.split("/uploads/avatars/")[-1]
                file_path = self._local_upload_dir / filename
                if file_path.exists():
                    file_path.unlink()
                    logger.info(f"[StorageService] Deleted local avatar: {file_path}")
            except OSError:
                pass
            return

        # R2 deletion
        if not self._client:
            return

        try:
            if self._public_url and avatar_url.startswith(self._public_url):
                key = avatar_url[len(self._public_url) + 1 :]
            elif self._bucket and f"{self._bucket}.r2.dev" in avatar_url:
                key = avatar_url.split(f"{self._bucket}.r2.dev/")[1]
            else:
                return  # Unknown URL format, skip deletion

            self._client.delete_object(Bucket=self._bucket, Key=key)
        except ClientError:
            # Silently ignore deletion errors
            pass


# Module-level singleton
_storage_service: StorageService | None = None


def get_storage_service() -> StorageService:
    """Get or create the storage service singleton."""
    global _storage_service
    if _storage_service is None:
        _storage_service = StorageService()
    return _storage_service
