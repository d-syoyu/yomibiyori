"""Cloudflare R2 client helpers (S3-compatible)."""

from __future__ import annotations

import boto3
from botocore.client import Config as BotoConfig
from uuid import uuid4
from datetime import datetime
from app.core.config import get_settings


def get_r2_client():
    """Return a boto3 client configured for R2."""
    settings = get_settings()
    if not (settings.r2_account_id and settings.r2_access_key_id and settings.r2_secret_access_key):
        raise RuntimeError("R2 credentials are not configured")

    endpoint_url = f"https://{settings.r2_account_id}.r2.cloudflarestorage.com"
    return boto3.client(
        "s3",
        endpoint_url=endpoint_url,
        aws_access_key_id=settings.r2_access_key_id,
        aws_secret_access_key=settings.r2_secret_access_key,
        config=BotoConfig(signature_version="s3v4"),
        region_name="auto",
    )


def build_r2_key(prefix: str, extension: str = "png") -> str:
    """Generate a unique object key under the given prefix."""
    now = datetime.utcnow()
    return f"{prefix}/{now.strftime('%Y/%m/%d')}/{uuid4().hex}.{extension}"

