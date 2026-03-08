"""Tests for theme AI client implementations."""

from __future__ import annotations

import logging
from datetime import date
from types import SimpleNamespace

import pytest

from app.services.theme_ai_client import (
    DummyThemeAIClient,
    OpenAIThemeClient,
    ThemeAIClientError,
    XAIThemeClient,
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


def test_xai_theme_client_uses_openai_judge_selection(
    monkeypatch: pytest.MonkeyPatch,
    caplog: pytest.LogCaptureFixture,
) -> None:
    from app.core import config as config_module

    settings = config_module.get_settings()
    monkeypatch.setattr(settings, "openai_api_key", "judge-key")
    monkeypatch.setattr(settings, "openai_eval_model", "gpt-eval")
    monkeypatch.setattr(settings, "openai_eval_timeout", 3.0)

    xai_payload = {
        "choices": [
            {
                "message": {
                    "content": (
                        "春の朝\n窓をあけたら\n風つよい\n---\n"
                        "すれ違う\nいつもの駅で\nまた会えた\n---\n"
                        "片一方\nなくしたピアス\nどこ行った"
                    )
                }
            }
        ]
    }
    judge_payload = {
        "choices": [
            {
                "message": {
                    "content": '{"selected_index": 1, "reason": "参加したくなる余白がある", "scores": [{"index": 1, "participation": 5}]}'
                }
            }
        ]
    }

    def fake_post(url, *args, **kwargs):
        payload = xai_payload if "api.x.ai" in url else judge_payload
        return SimpleNamespace(
            status_code=200,
            json=lambda payload=payload: payload,
            raise_for_status=lambda: None,
        )

    monkeypatch.setattr("app.services.theme_ai_client.requests.post", fake_post)

    client = XAIThemeClient(api_key="xai-key", timeout=5.0)
    with caplog.at_level(logging.INFO):
        verse = client.generate(category="恋愛", target_date=date(2025, 1, 11))

    assert verse == "すれ違う\nいつもの駅で\nまた会えた"
    assert '"openai_selected_index": 1' in caplog.text
    assert '"fallback_used": false' in caplog.text
    assert '"openai_reason": "参加したくなる余白がある"' in caplog.text


def test_xai_theme_client_retries_when_openai_picks_invalid_mora_candidate(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from app.core import config as config_module

    settings = config_module.get_settings()
    monkeypatch.setattr(settings, "openai_api_key", "judge-key")
    monkeypatch.setattr(settings, "openai_eval_model", "gpt-eval")
    monkeypatch.setattr(settings, "openai_eval_timeout", 3.0)

    xai_responses = iter(
        [
            {
                "choices": [
                    {
                        "message": {
                            "content": (
                                "すれ違う\nいつもの駅で\nまた会えたよ\n---\n"
                                "傘なくて\nにわか雨降る\n君と僕\n---\n"
                                "寝過ごして\n電車の中で\n目が覚める"
                            )
                        }
                    }
                ]
            },
            {
                "choices": [
                    {
                        "message": {
                            "content": (
                                "コンビニで\nアイスを買って\n帰る道\n---\n"
                                "すれ違う\nいつもの駅で\nまた会えた\n---\n"
                                "片一方\nなくしたピアス\nどこ行った"
                            )
                        }
                    }
                ]
            },
        ]
    )
    judge_responses = iter(
        [
            {
                "choices": [
                    {
                        "message": {
                            "content": '{"selected_index": 0, "reason": "最も強い", "scores": [{"index": 0, "mora_validity": 5}]}'
                        }
                    }
                ]
            },
            {
                "choices": [
                    {
                        "message": {
                            "content": '{"selected_index": 1, "reason": "余白がある", "scores": [{"index": 1, "mora_validity": 5}]}'
                        }
                    }
                ]
            },
        ]
    )

    def fake_post(url, *args, **kwargs):
        payload = next(xai_responses) if "api.x.ai" in url else next(judge_responses)
        return SimpleNamespace(
            status_code=200,
            json=lambda payload=payload: payload,
            raise_for_status=lambda: None,
        )

    monkeypatch.setattr("app.services.theme_ai_client.requests.post", fake_post)

    client = XAIThemeClient(api_key="xai-key", timeout=5.0)
    verse = client.generate(category="恋愛", target_date=date(2025, 1, 11))

    assert verse == "すれ違う\nいつもの駅で\nまた会えた"


def test_xai_theme_client_falls_back_when_openai_judge_returns_invalid_json(
    monkeypatch: pytest.MonkeyPatch,
    caplog: pytest.LogCaptureFixture,
) -> None:
    from app.core import config as config_module

    settings = config_module.get_settings()
    monkeypatch.setattr(settings, "openai_api_key", "judge-key")
    monkeypatch.setattr(settings, "openai_eval_model", "gpt-eval")
    monkeypatch.setattr(settings, "openai_eval_timeout", 3.0)

    xai_payload = {
        "choices": [
            {
                "message": {
                    "content": (
                        "すれ違う\nいつもの駅で\nまた会えた\n---\n"
                        "傘なくて\nにわか雨降る\n君と僕\n---\n"
                        "寝過ごして\n電車の中で\n目が覚める"
                    )
                }
            }
        ]
    }
    judge_payload = {"choices": [{"message": {"content": "not json"}}]}

    def fake_post(url, *args, **kwargs):
        payload = xai_payload if "api.x.ai" in url else judge_payload
        return SimpleNamespace(
            status_code=200,
            json=lambda payload=payload: payload,
            raise_for_status=lambda: None,
        )

    monkeypatch.setattr("app.services.theme_ai_client.requests.post", fake_post)

    client = XAIThemeClient(api_key="xai-key", timeout=5.0)
    with caplog.at_level(logging.INFO):
        verse = client.generate(category="日常", target_date=date(2025, 1, 11))

    assert verse == "すれ違う\nいつもの駅で\nまた会えた"
    assert '"fallback_used": true' in caplog.text
    assert '"failure_type": "openai_judge_failed"' in caplog.text


def test_xai_theme_client_raises_when_all_candidates_are_invalid(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from app.core import config as config_module

    settings = config_module.get_settings()
    monkeypatch.setattr(settings, "openai_api_key", None)

    xai_payload = {
        "choices": [
            {
                "message": {
                    "content": (
                        "すれ違う\nいつもの駅で\nまた会えたよ\n---\n"
                        "傘なくて\nにわか雨ふるよ\n君と僕\n---\n"
                        "寝過ごして\n電車の中だよ\n目が覚める"
                    )
                }
            }
        ]
    }

    def fake_post(*args, **kwargs):
        return SimpleNamespace(
            status_code=200,
            json=lambda: xai_payload,
            raise_for_status=lambda: None,
        )

    monkeypatch.setattr("app.services.theme_ai_client.requests.post", fake_post)

    client = XAIThemeClient(api_key="xai-key", timeout=5.0)
    with pytest.raises(ThemeAIClientError):
        client.generate(category="日常", target_date=date(2025, 1, 11))


def test_xai_theme_client_filters_out_past_theme_duplicates(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from app.core import config as config_module

    settings = config_module.get_settings()
    monkeypatch.setattr(settings, "openai_api_key", "judge-key")
    monkeypatch.setattr(settings, "openai_eval_model", "gpt-eval")
    monkeypatch.setattr(settings, "openai_eval_timeout", 3.0)

    xai_payload = {
        "choices": [
            {
                "message": {
                    "content": (
                        "すれ違う\nいつもの駅で\nまた会えた\n---\n"
                        "傘なくて\nにわか雨降る\n君と僕\n---\n"
                        "寝過ごして\n電車の中で\n目が覚める"
                    )
                }
            }
        ]
    }
    judge_payload = {
        "choices": [
            {
                "message": {
                    "content": '{"selected_index": 1, "reason": "重複していない", "scores": [{"index": 1, "participation": 5}]}'
                }
            }
        ]
    }

    def fake_post(url, *args, **kwargs):
        payload = xai_payload if "api.x.ai" in url else judge_payload
        return SimpleNamespace(
            status_code=200,
            json=lambda payload=payload: payload,
            raise_for_status=lambda: None,
        )

    monkeypatch.setattr("app.services.theme_ai_client.requests.post", fake_post)

    client = XAIThemeClient(api_key="xai-key", timeout=5.0)
    verse = client.generate(
        category="恋愛",
        target_date=date(2025, 1, 11),
        past_themes=["すれ違う\nいつもの駅で\nまた会えた"],
    )

    assert verse == "傘なくて\nにわか雨降る\n君と僕"
