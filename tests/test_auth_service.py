"""Unit tests for Supabase JWKS caching helpers."""

from __future__ import annotations

import types

import pytest
import requests

from app.services import auth as auth_service


class _DummyResponse:
    def __init__(self, status_code: int, payload: dict, headers: dict | None = None):
        self.status_code = status_code
        self._payload = payload
        self.headers = headers or {}

    def json(self) -> dict:
        return self._payload

    def raise_for_status(self) -> None:
        if self.status_code >= 400:
            raise requests.HTTPError("error")


@pytest.fixture
def reset_jwks_cache() -> None:
    """Reset the module-level JWKS cache before and after tests."""

    cache = auth_service._jwks_cache
    original = (cache._keys, cache._etag, cache._expires_at)
    cache._keys = None
    cache._etag = None
    cache._expires_at = 0.0
    yield
    cache._keys, cache._etag, cache._expires_at = original


def test_jwks_cache_uses_ttl(monkeypatch: pytest.MonkeyPatch, reset_jwks_cache) -> None:
    settings = auth_service.get_settings()
    monkeypatch.setattr(settings, "supabase_jwks_cache_ttl_seconds", 600)
    monkeypatch.setattr(settings, "supabase_request_timeout", 1.0)

    call_counter = {"count": 0}

    def fake_get(url, headers=None, timeout=None):  # type: ignore[no-untyped-def]
        call_counter["count"] += 1
        return _DummyResponse(200, {"keys": [{"kid": "123"}]}, headers={"ETag": '"version"'})

    monkeypatch.setattr(auth_service, "get_settings", lambda: settings)
    monkeypatch.setattr(auth_service.requests, "get", fake_get)

    first = auth_service._jwks_cache.get_keys()
    second = auth_service._jwks_cache.get_keys()

    assert first == {"keys": [{"kid": "123"}]}
    assert second == first
    assert call_counter["count"] == 1


def test_jwks_cache_returns_stale_on_failure(monkeypatch: pytest.MonkeyPatch, reset_jwks_cache) -> None:
    settings = auth_service.get_settings()
    monkeypatch.setattr(auth_service, "get_settings", lambda: settings)

    cache = auth_service._jwks_cache
    cache._keys = {"keys": [{"kid": "abc"}]}
    cache._etag = '"etag"'
    cache._expires_at = 0.0  # Force refresh

    def failing_get(url, headers=None, timeout=None):  # type: ignore[no-untyped-def]
        raise requests.ConnectionError("network down")

    monkeypatch.setattr(auth_service.requests, "get", failing_get)

    keys = cache.get_keys()
    assert keys == {"keys": [{"kid": "abc"}]}
