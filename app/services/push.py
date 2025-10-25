"""Utility helpers for sending Expo push notifications."""

from __future__ import annotations

from collections.abc import Iterable
from dataclasses import dataclass
from typing import Any

import requests

from app.core.config import get_settings
from app.core.logging import logger

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"


class PushNotificationError(RuntimeError):
    """Raised when the Expo push notification API returns an error."""


@dataclass(slots=True)
class PushMessage:
    """Structure representing a single Expo push notification."""

    to: str
    title: str
    body: str
    data: dict[str, Any] | None = None
    sound: str | None = "default"


def _chunk(iterable: Iterable[Any], size: int) -> Iterable[list[Any]]:
    """Yield lists from *iterable* of length *size*."""

    chunk: list[Any] = []
    for item in iterable:
        chunk.append(item)
        if len(chunk) == size:
            yield chunk
            chunk = []
    if chunk:
        yield chunk


def send_push_notifications(messages: list[PushMessage]) -> None:
    """Send one or more push notifications via Expo.

    Args:
        messages: Collection of messages to send. Each message must include a valid Expo push token.

    Raises:
        PushNotificationError: When the Expo API returns an error or no access token is configured.
    """

    if not messages:
        logger.debug("[push] No messages to deliver; skipping Expo call.")
        return

    settings = get_settings()
    access_token = settings.expo_access_token
    if not access_token:
        raise PushNotificationError("Expo access token is not configured")

    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
    }

    for batch in _chunk(messages, 100):
        payload = [
            {
                "to": msg.to,
                "title": msg.title,
                "body": msg.body,
                "data": msg.data or {},
                "sound": msg.sound,
            }
            for msg in batch
        ]

        try:
            response = requests.post(EXPO_PUSH_URL, json=payload, headers=headers, timeout=10)
        except requests.RequestException as exc:
            logger.exception("[push] Expo request failed: %s", exc)
            raise PushNotificationError("Expo push request failed") from exc

        if response.status_code >= 400:
            logger.error("[push] Expo push API returned %s - %s", response.status_code, response.text)
            raise PushNotificationError(f"Expo push API returned {response.status_code}")

        try:
            payload_json = response.json()
        except ValueError as exc:
            raise PushNotificationError("Invalid response payload from Expo push API") from exc

        # Expo responds with {"data": [{status: "ok" ...}, ...]}
        tickets = payload_json.get("data")
        if not isinstance(tickets, list):
            raise PushNotificationError("Malformed Expo push response payload")

        for ticket, message in zip(tickets, batch, strict=False):
            status = ticket.get("status")
            if status != "ok":
                error_message = ticket.get("message") or ticket.get("details") or "Unknown Expo push error"
                logger.error("[push] Expo push ticket failed for %s: %s", message.to, error_message)
                raise PushNotificationError(error_message)

        logger.debug("[push] Successfully sent %s Expo push messages.", len(batch))
