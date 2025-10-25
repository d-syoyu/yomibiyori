"""Tests for Expo push notification service."""

from __future__ import annotations

from types import SimpleNamespace
from uuid import uuid4

import pytest

from app.services import push


class _DummyResponse:
    def __init__(self, status_code: int, payload: dict):
        self.status_code = status_code
        self._payload = payload
        self.text = "dummy"

    def json(self) -> dict:
        return self._payload


def test_send_push_notifications_success(monkeypatch: pytest.MonkeyPatch) -> None:
    captured = SimpleNamespace(payload=None, headers=None)

    def fake_post(url, json, headers, timeout):  # type: ignore[no-untyped-def]
        captured.payload = json
        captured.headers = headers
        return _DummyResponse(200, {"data": [{"status": "ok"} for _ in json]})

    monkeypatch.setattr(push.requests, "post", fake_post)

    messages = [
        push.PushMessage(to=f"ExponentPushToken[{uuid4()}]", title="Hello", body="World"),
    ]

    push.send_push_notifications(messages)

    assert captured.payload is not None
    assert captured.payload[0]["title"] == "Hello"
    assert captured.headers["Authorization"].startswith("Bearer ")


def test_send_push_notifications_ticket_error(monkeypatch: pytest.MonkeyPatch) -> None:
    def fake_post(url, json, headers, timeout):  # type: ignore[no-untyped-def]
        return _DummyResponse(200, {"data": [{"status": "error", "message": "Invalid push token"}]})

    monkeypatch.setattr(push.requests, "post", fake_post)

    with pytest.raises(push.PushNotificationError):
        push.send_push_notifications(
            [
                push.PushMessage(to="ExponentPushToken[fake]", title="Test", body="Body"),
            ]
        )


def test_send_push_notifications_missing_token(monkeypatch: pytest.MonkeyPatch) -> None:
    settings = push.get_settings()
    monkeypatch.setattr(settings, "expo_access_token", None)

    with pytest.raises(push.PushNotificationError):
        push.send_push_notifications(
            [push.PushMessage(to="ExponentPushToken[fake]", title="Test", body="Body")]
        )
