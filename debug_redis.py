"""Debug script to check Redis ranking data."""

import os
import sys
from redis import Redis
from urllib.parse import urlparse

# Add app to path
sys.path.insert(0, os.path.dirname(__file__))

from app.core.config import get_settings

def main():
    settings = get_settings()

    print(f"Redis URL: {settings.redis_url}")
    print(f"Redis Ranking Prefix: {settings.redis_ranking_prefix}")

    # Connect to Redis
    try:
        redis_client = Redis.from_url(settings.redis_url, decode_responses=True)
        redis_client.ping()
        print("OK: Redis connection successful")
    except Exception as e:
        print(f"ERROR: Redis connection failed: {e}")
        return

    # List all ranking keys
    ranking_keys = redis_client.keys(f"{settings.redis_ranking_prefix}*")
    print(f"\nFound {len(ranking_keys)} ranking keys:")
    for key in ranking_keys:
        print(f"  - {key}")
        # Get number of works in this ranking
        count = redis_client.zcard(key)
        print(f"    Works: {count}")

        # Show first 5 works
        if count > 0:
            works = redis_client.zrevrange(key, 0, 4, withscores=True)
            for work_id, score in works:
                print(f"      {work_id}: {score}")

    # List all metrics keys
    metrics_keys = redis_client.keys("metrics:*")
    print(f"\nFound {len(metrics_keys)} metrics keys:")
    for key in metrics_keys[:10]:  # Show first 10
        print(f"  - {key}")
        metrics = redis_client.hgetall(key)
        print(f"    {metrics}")

if __name__ == "__main__":
    main()
