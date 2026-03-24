"""Tests for PLaMo AI client implementations (theme + work)."""

from __future__ import annotations

import logging
from datetime import date
from types import SimpleNamespace

import pytest

from app.services.theme_ai_client import (
    PLaMoThemeClient,
    ThemeAIClientError,
    resolve_theme_ai_client,
)
from app.services.work_ai_client import (
    PLaMoWorkClient,
    WorkAIClientError,
    resolve_work_ai_client,
)


# ---------------------------------------------------------------------------
# PLaMoThemeClient tests
# ---------------------------------------------------------------------------


def test_plamo_theme_client_uses_openai_judge_selection(
    monkeypatch: pytest.MonkeyPatch,
    caplog: pytest.LogCaptureFixture,
) -> None:
    from app.core import config as config_module

    settings = config_module.get_settings()
    monkeypatch.setattr(settings, "openai_api_key", "judge-key")
    monkeypatch.setattr(settings, "openai_eval_model", "gpt-eval")
    monkeypatch.setattr(settings, "openai_eval_timeout", 3.0)

    plamo_payload = {
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
        "output_text": '{"selected_index": 1, "reason": "余白がある", "scores": [{"index": 1, "participation": 5, "naturalness": 5, "imagery": 5, "openness": 5, "concreteness": 5, "mora_validity": 5}]}'
    }

    def fake_post(url, *args, **kwargs):
        payload = plamo_payload if "preferredai" in url else judge_payload
        return SimpleNamespace(
            status_code=200,
            json=lambda payload=payload: payload,
            raise_for_status=lambda: None,
        )

    monkeypatch.setattr("app.services.theme_ai_client.requests.post", fake_post)

    client = PLaMoThemeClient(api_key="plamo-key", timeout=5.0)
    with caplog.at_level(logging.INFO):
        verse = client.generate(category="恋愛", target_date=date(2025, 1, 11))

    assert verse == "すれ違う\nいつもの駅で\nまた会えた"
    assert '"openai_selected_index": 1' in caplog.text
    assert '"provider": "plamo"' in caplog.text


def test_plamo_theme_client_falls_back_when_judge_fails(
    monkeypatch: pytest.MonkeyPatch,
    caplog: pytest.LogCaptureFixture,
) -> None:
    from app.core import config as config_module

    settings = config_module.get_settings()
    monkeypatch.setattr(settings, "openai_api_key", "judge-key")
    monkeypatch.setattr(settings, "openai_eval_model", "gpt-eval")
    monkeypatch.setattr(settings, "openai_eval_timeout", 3.0)

    plamo_payload = {
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
    judge_payload = {"output_text": "not json"}

    def fake_post(url, *args, **kwargs):
        payload = plamo_payload if "preferredai" in url else judge_payload
        return SimpleNamespace(
            status_code=200,
            json=lambda payload=payload: payload,
            raise_for_status=lambda: None,
        )

    monkeypatch.setattr("app.services.theme_ai_client.requests.post", fake_post)

    client = PLaMoThemeClient(api_key="plamo-key", timeout=5.0)
    with caplog.at_level(logging.INFO):
        verse = client.generate(category="日常", target_date=date(2025, 1, 11))

    assert verse == "すれ違う\nいつもの駅で\nまた会えた"
    assert '"fallback_used": true' in caplog.text


def test_plamo_theme_client_raises_on_all_invalid_candidates(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from app.core import config as config_module

    settings = config_module.get_settings()
    monkeypatch.setattr(settings, "openai_api_key", None)

    plamo_payload = {
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
            json=lambda: plamo_payload,
            raise_for_status=lambda: None,
        )

    monkeypatch.setattr("app.services.theme_ai_client.requests.post", fake_post)

    client = PLaMoThemeClient(api_key="plamo-key", timeout=5.0)
    with pytest.raises(ThemeAIClientError):
        client.generate(category="日常", target_date=date(2025, 1, 11))


def test_plamo_theme_client_raises_on_bad_payload(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def fake_post(*args, **kwargs):
        return SimpleNamespace(
            status_code=200,
            json=lambda: {},
            raise_for_status=lambda: None,
        )

    monkeypatch.setattr("app.services.theme_ai_client.requests.post", fake_post)
    client = PLaMoThemeClient(api_key="plamo-key")

    with pytest.raises(ThemeAIClientError):
        client.generate(category="恋愛", target_date=date(2025, 1, 12))


def test_resolve_theme_ai_client_returns_plamo(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from app.core import config as config_module

    settings = config_module.get_settings()
    monkeypatch.setattr(settings, "theme_ai_provider", "plamo")
    monkeypatch.setattr(settings, "plamo_api_key", "test-plamo-key")

    client = resolve_theme_ai_client()
    assert isinstance(client, PLaMoThemeClient)
    assert client.api_key == "test-plamo-key"


def test_resolve_theme_ai_client_plamo_requires_api_key(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from app.core import config as config_module

    settings = config_module.get_settings()
    monkeypatch.setattr(settings, "theme_ai_provider", "plamo")
    monkeypatch.setattr(settings, "plamo_api_key", None)

    with pytest.raises(ThemeAIClientError):
        resolve_theme_ai_client()


# ---------------------------------------------------------------------------
# PLaMoWorkClient tests
# ---------------------------------------------------------------------------


def test_plamo_work_client_parses_valid_response(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    payload = {
        "choices": [
            {
                "message": {"content": "あなたの声が\n聞こえなくなる"},
            }
        ]
    }

    def fake_post(*args, **kwargs):
        return SimpleNamespace(
            status_code=200,
            json=lambda: payload,
            raise_for_status=lambda: None,
        )

    monkeypatch.setattr("app.services.work_ai_client.requests.post", fake_post)

    client = PLaMoWorkClient(api_key="plamo-key", timeout=5.0)
    verse = client.generate(
        upper_verse="すれ違う\nいつもの駅で\nまた会えた",
        category="恋愛",
        username="テスト詩人",
    )
    assert verse == "あなたの声が\n聞こえなくなる"


def test_plamo_work_client_retries_on_invalid_mora(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    call_count = 0

    def fake_post(*args, **kwargs):
        nonlocal call_count
        call_count += 1
        # First call: invalid (6-7), second call: valid (7-7)
        if call_count == 1:
            content = "声が響く\n聞こえなくなる"
        else:
            content = "あなたの声が\n聞こえなくなる"
        return SimpleNamespace(
            status_code=200,
            json=lambda content=content: {"choices": [{"message": {"content": content}}]},
            raise_for_status=lambda: None,
        )

    monkeypatch.setattr("app.services.work_ai_client.requests.post", fake_post)

    client = PLaMoWorkClient(api_key="plamo-key", timeout=5.0)
    verse = client.generate(
        upper_verse="すれ違う\nいつもの駅で\nまた会えた",
        category="恋愛",
        username="テスト詩人",
    )
    assert verse == "あなたの声が\n聞こえなくなる"
    assert call_count == 2


def test_plamo_work_client_raises_on_bad_payload(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    call_count = 0

    def fake_post(*args, **kwargs):
        nonlocal call_count
        call_count += 1
        return SimpleNamespace(
            status_code=200,
            json=lambda: {},
            raise_for_status=lambda: None,
        )

    monkeypatch.setattr("app.services.work_ai_client.requests.post", fake_post)
    client = PLaMoWorkClient(api_key="plamo-key", timeout=5.0)

    with pytest.raises(WorkAIClientError):
        client.generate(
            upper_verse="すれ違う\nいつもの駅で\nまた会えた",
            category="恋愛",
            username="テスト",
        )


def test_plamo_work_client_uses_persona(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    captured_payload: dict = {}

    def fake_post(url, *, json=None, headers=None, timeout=None):
        nonlocal captured_payload
        captured_payload = json or {}
        return SimpleNamespace(
            status_code=200,
            json=lambda: {"choices": [{"message": {"content": "あなたの声が\n聞こえなくなる"}}]},
            raise_for_status=lambda: None,
        )

    monkeypatch.setattr("app.services.work_ai_client.requests.post", fake_post)

    client = PLaMoWorkClient(api_key="plamo-key", timeout=5.0)
    client.generate(
        upper_verse="すれ違う\nいつもの駅で\nまた会えた",
        category="恋愛",
        username="月夜のゆき",
        persona="夜や月の美しさ、静かな情景を詠む詩人",
    )

    system_content = captured_payload["messages"][0]["content"]
    assert "月夜のゆき" in system_content
    assert "夜や月の美しさ" in system_content
    assert captured_payload["model"] == "plamo-2.2-prime"
    assert "preferredai" in client.endpoint


def test_resolve_work_ai_client_returns_plamo(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from app.core import config as config_module

    settings = config_module.get_settings()
    monkeypatch.setattr(settings, "theme_ai_provider", "plamo")
    monkeypatch.setattr(settings, "plamo_api_key", "test-plamo-key")

    client = resolve_work_ai_client()
    assert isinstance(client, PLaMoWorkClient)
    assert client.api_key == "test-plamo-key"


def test_resolve_work_ai_client_plamo_requires_api_key(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from app.core import config as config_module

    settings = config_module.get_settings()
    monkeypatch.setattr(settings, "theme_ai_provider", "plamo")
    monkeypatch.setattr(settings, "plamo_api_key", None)

    with pytest.raises(WorkAIClientError):
        resolve_work_ai_client()
