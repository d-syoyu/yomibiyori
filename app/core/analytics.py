"""
Analytics Module
PostHog integration for event tracking and user behavior analysis
"""

import hashlib
import os
from typing import Any, Dict, Optional

from posthog import Posthog

# PostHog client initialization
_posthog_client: Optional[Posthog] = None


def _hash_distinct_id(value: str) -> str:
    """Return a stable SHA-256 hex digest for the supplied value."""

    if not value:
        value = "anonymous"
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def _prepare_distinct_id(distinct_id: str, *, prehashed: bool) -> str:
    """Return a hashed distinct_id unless the caller already hashed it."""

    return distinct_id if prehashed else _hash_distinct_id(distinct_id)


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
    *,
    prehashed_distinct_id: bool = False,
) -> None:
    """
    Track an event to PostHog

    Args:
        distinct_id: Unique identifier for the user (typically user_id)
        event_name: Name of the event to track
        properties: Additional properties to attach to the event
        prehashed_distinct_id: Set to True when the supplied identifier is already anonymized
    """
    client = get_posthog_client()
    if client is None:
        return

    try:
        client.capture(
            distinct_id=_prepare_distinct_id(distinct_id, prehashed=prehashed_distinct_id),
            event=event_name,
            properties=properties or {},
        )
    except Exception as e:
        print(f"[Analytics] Failed to track event '{event_name}': {e}")


def identify_user(
    distinct_id: str,
    properties: Optional[Dict[str, Any]] = None,
    *,
    prehashed_distinct_id: bool = False,
) -> None:
    """
    Identify a user in PostHog by setting user properties

    Args:
        distinct_id: Unique identifier for the user
        properties: User properties (email, name, etc.)

    Note: PostHog Python SDK v6+ uses set() instead of identify()
    """
    client = get_posthog_client()
    if client is None:
        return

    try:
        # Use set() to set person properties (replaces identify() in v6+)
        client.set(
            distinct_id=_prepare_distinct_id(distinct_id, prehashed=prehashed_distinct_id),
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


def is_sample_account(email: Optional[str]) -> bool:
    """Check if the email belongs to a sample/test account.

    Sample accounts are identified by the @yomibiyori.app domain.
    """
    if not email:
        return False
    return email.endswith("@yomibiyori.app")


def get_email_domain(email: Optional[str]) -> Optional[str]:
    """Extract the domain from an email address.

    Returns the domain part (after @) or None if email is invalid.
    """
    if not email or "@" not in email:
        return None
    return email.split("@")[-1].lower()


# Event names constants
class EventNames:
    """Standard event names for tracking"""

    # Authentication
    USER_REGISTERED = "user_registered"
    USER_LOGGED_IN = "user_logged_in"
    PROFILE_UPDATED = "profile_updated"
    ACCOUNT_DELETED = "account_deleted"

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
    RANKING_FINALIZED = "ranking_finalized"

    # Errors
    API_ERROR = "api_error"
