"""Redis client factory."""

from __future__ import annotations

from functools import lru_cache

from redis import Redis

from app.core.config import get_settings


@lru_cache(maxsize=1)
def _create_client() -> Redis:
    """Instantiate a Redis client configured from environment."""

    settings = get_settings()
    return Redis.from_url(settings.redis_url, decode_responses=True, health_check_interval=30)


def get_redis_client() -> Redis:
    """Return a cached Redis client instance."""

    return _create_client()
