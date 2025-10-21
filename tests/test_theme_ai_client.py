"""Tests for theme AI client implementations."""

from __future__ import annotations

from datetime import date
from types import SimpleNamespace

import pytest

from app.services.theme_ai_client import (
    DummyThemeAIClient,
    OpenAIThemeClient,
    ThemeAIClientError,
    resolve_theme_ai_client,
)


def test_dummy_theme_ai_client_returns_placeholder() -> None:
    client = DummyThemeAIClient(prefix="Test Theme")
    result = client.generate(category="nature", target_date=date(2025, 1, 10))
    assert "Test Theme" in result
    assert "nature" in result


def test_openai_theme_client_parses_response(monkeypatch: pytest.MonkeyPatch) -> None:
    payload = {
        "choices": [
            {
                "message": {"content": "朝靄に舞う春の囁き"},
            }
        ]
    }

    def fake_post(*args, **kwargs):
        return SimpleNamespace(
            status_code=200,
            json=lambda: payload,
            raise_for_status=lambda: None,
        )

    monkeypatch.setattr("app.services.theme_ai_client.requests.post", fake_post)

    client = OpenAIThemeClient(api_key="test-key", model="gpt-test", timeout=5.0)
    verse = client.generate(category="season", target_date=date(2025, 1, 11))
    assert verse == "朝靄に舞う春の囁き"
    assert fake_post.__defaults__ is None  # calm linter


def test_openai_theme_client_raises_on_bad_payload(monkeypatch: pytest.MonkeyPatch) -> None:
    def fake_post(*args, **kwargs):
        return SimpleNamespace(
            status_code=200,
            json=lambda: {},
            raise_for_status=lambda: None,
        )

    monkeypatch.setattr("app.services.theme_ai_client.requests.post", fake_post)
    client = OpenAIThemeClient(api_key="test-key")

    with pytest.raises(ThemeAIClientError):
        client.generate(category="emotion", target_date=date(2025, 1, 12))


def test_resolve_theme_ai_client_requires_api_key(monkeypatch: pytest.MonkeyPatch) -> None:
    from app.core import config as config_module

    settings = config_module.get_settings()
    monkeypatch.setattr(settings, "theme_ai_provider", "openai")
    monkeypatch.setattr(settings, "openai_api_key", None)

    with pytest.raises(ThemeAIClientError):
        resolve_theme_ai_client()
