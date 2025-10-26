"""
Analytics Module
PostHog integration for event tracking and user behavior analysis
"""

import os
from typing import Dict, Optional, Any
from posthog import Posthog

# PostHog client initialization
_posthog_client: Optional[Posthog] = None


def get_posthog_client() -> Optional[Posthog]:
    """
    Get or create PostHog client instance

    Returns:
        Optional[Posthog]: PostHog client instance, or None if not configured
    """
    global _posthog_client

    if _posthog_client is not None:
        return _posthog_client

    api_key = os.getenv("POSTHOG_API_KEY")
    host = os.getenv("POSTHOG_HOST", "https://app.posthog.com")

    if not api_key:
        print("[Analytics] PostHog not configured (POSTHOG_API_KEY missing)")
        return None

    try:
        _posthog_client = Posthog(
            project_api_key=api_key,
            host=host,
            debug=os.getenv("DEBUG", "false").lower() == "true",
        )
        print(f"[Analytics] PostHog initialized: {host}")
        return _posthog_client
    except Exception as e:
        print(f"[Analytics] Failed to initialize PostHog: {e}")
        return None


def track_event(
    distinct_id: str,
    event_name: str,
    properties: Optional[Dict[str, Any]] = None,
) -> None:
    """
    Track an event to PostHog

    Args:
        distinct_id: Unique identifier for the user (typically user_id)
        event_name: Name of the event to track
        properties: Additional properties to attach to the event
    """
    client = get_posthog_client()
    if client is None:
        return

    try:
        client.capture(
            distinct_id=distinct_id,
            event=event_name,
            properties=properties or {},
        )
    except Exception as e:
        print(f"[Analytics] Failed to track event '{event_name}': {e}")


def identify_user(
    distinct_id: str,
    properties: Optional[Dict[str, Any]] = None,
) -> None:
    """
    Identify a user in PostHog

    Args:
        distinct_id: Unique identifier for the user
        properties: User properties (email, name, etc.)
    """
    client = get_posthog_client()
    if client is None:
        return

    try:
        client.identify(
            distinct_id=distinct_id,
            properties=properties or {},
        )
    except Exception as e:
        print(f"[Analytics] Failed to identify user '{distinct_id}': {e}")


def shutdown_analytics() -> None:
    """
    Shutdown PostHog client and flush remaining events
    """
    global _posthog_client

    if _posthog_client is not None:
        try:
            _posthog_client.shutdown()
            print("[Analytics] PostHog shutdown")
        except Exception as e:
            print(f"[Analytics] Error during shutdown: {e}")
        finally:
            _posthog_client = None


# Event names constants
class EventNames:
    """Standard event names for tracking"""

    # Authentication
    USER_REGISTERED = "user_registered"
    USER_LOGGED_IN = "user_logged_in"

    # Content creation
    WORK_CREATED = "work_created"
    WORK_DELETED = "work_deleted"

    # Engagement
    WORK_LIKED = "work_liked"
    WORK_VIEWED = "work_viewed"

    # Content consumption
    THEME_VIEWED = "theme_viewed"
    RANKING_VIEWED = "ranking_viewed"
    MY_POEMS_VIEWED = "my_poems_viewed"

    # Errors
    API_ERROR = "api_error"
