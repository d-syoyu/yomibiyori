"""Tests for PLaMo AI client implementations (PLaMo ideation → XAI composition pipeline)."""

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
# Helper: build fake HTTP post that routes PLaMo vs XAI vs OpenAI
# ---------------------------------------------------------------------------

def _make_router(plamo_content: str, xai_content: str, judge_payload: dict | None = None):
    """Return a fake requests.post that routes by URL."""

    def fake_post(url, *args, **kwargs):
        if "preferredai" in url:
            payload = {"choices": [{"message": {"content": plamo_content}}]}
        elif "x.ai" in url:
            payload = {"choices": [{"message": {"content": xai_content}}]}
        elif "openai" in url and judge_payload is not None:
            payload = judge_payload
        else:
            payload = {"choices": [{"message": {"content": xai_content}}]}
        return SimpleNamespace(
            status_code=200,
            json=lambda payload=payload: payload,
            raise_for_status=lambda: None,
        )

    return fake_post


# ---------------------------------------------------------------------------
# PLaMoThemeClient tests (PLaMo ideation → XAI composition → Judge)
# ---------------------------------------------------------------------------


def test_plamo_theme_client_pipeline_with_judge(
    monkeypatch: pytest.MonkeyPatch,
    caplog: pytest.LogCaptureFixture,
) -> None:
    """Full pipeline: PLaMo ideation → XAI composition → OpenAI judge selection."""
    from app.core import config as config_module

    settings = config_module.get_settings()
    monkeypatch.setattr(settings, "openai_api_key", "judge-key")
    monkeypatch.setattr(settings, "openai_eval_model", "gpt-eval")
    monkeypatch.setattr(settings, "openai_eval_timeout", 3.0)

    plamo_ideas = (
        "コンビニのレジ横でおでんの湯気を見て思わず買ってしまう帰り道\n"
        "電車で寝過ごして知らない駅で目が覚める朝\n"
        "冷蔵庫の奥に忘れていたきゅうりを発見する瞬間"
    )
    xai_candidates = (
        "春の朝\n窓をあけたら\n風つよい\n---\n"
        "すれ違う\nいつもの駅で\nまた会えた\n---\n"
        "片一方\nなくしたピアス\nどこ行った"
    )
    judge_payload = {
        "output_text": '{"selected_index": 1, "reason": "余白がある", "scores": [{"index": 1, "participation": 5, "naturalness": 5, "imagery": 5, "openness": 5, "concreteness": 5, "mora_validity": 5}]}'
    }

    fake_post = _make_router(plamo_ideas, xai_candidates, judge_payload)
    monkeypatch.setattr("app.services.theme_ai_client.requests.post", fake_post)

    client = PLaMoThemeClient(
        api_key="plamo-key",
        timeout=5.0,
        xai_api_key="xai-key",
        xai_timeout=5.0,
    )
    with caplog.at_level(logging.INFO):
        verse = client.generate(category="恋愛", target_date=date(2025, 1, 11))

    assert verse == "すれ違う\nいつもの駅で\nまた会えた"
    assert '"openai_selected_index": 1' in caplog.text
    assert '"provider": "plamo+xai"' in caplog.text


def test_plamo_theme_client_falls_back_when_judge_fails(
    monkeypatch: pytest.MonkeyPatch,
    caplog: pytest.LogCaptureFixture,
) -> None:
    """When judge returns invalid JSON, fall back to local selection."""
    from app.core import config as config_module

    settings = config_module.get_settings()
    monkeypatch.setattr(settings, "openai_api_key", "judge-key")
    monkeypatch.setattr(settings, "openai_eval_model", "gpt-eval")
    monkeypatch.setattr(settings, "openai_eval_timeout", 3.0)

    plamo_ideas = "電車で寝過ごして知らない駅で目覚める\nコンビニで傘を買う雨の日"
    xai_candidates = (
        "すれ違う\nいつもの駅で\nまた会えた\n---\n"
        "傘なくて\nにわか雨降る\n君と僕\n---\n"
        "寝過ごして\n電車の中で\n目が覚める"
    )
    judge_payload = {"output_text": "not json"}

    fake_post = _make_router(plamo_ideas, xai_candidates, judge_payload)
    monkeypatch.setattr("app.services.theme_ai_client.requests.post", fake_post)

    client = PLaMoThemeClient(
        api_key="plamo-key",
        timeout=5.0,
        xai_api_key="xai-key",
        xai_timeout=5.0,
    )
    with caplog.at_level(logging.INFO):
        verse = client.generate(category="日常", target_date=date(2025, 1, 11))

    assert verse == "すれ違う\nいつもの駅で\nまた会えた"
    assert '"fallback_used": true' in caplog.text


def test_plamo_theme_client_raises_on_all_invalid_xai_candidates(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """When XAI produces no valid 5-7-5 candidates, retries exhaust."""
    from app.core import config as config_module

    settings = config_module.get_settings()
    monkeypatch.setattr(settings, "openai_api_key", None)

    plamo_ideas = "ある日の出来事"
    # All candidates have invalid mora
    xai_bad_candidates = (
        "すれ違う\nいつもの駅で\nまた会えたよ\n---\n"
        "傘なくて\nにわか雨ふるよ\n君と僕\n---\n"
        "寝過ごして\n電車の中だよ\n目が覚める"
    )

    call_count = 0

    def fake_post(url, *args, **kwargs):
        nonlocal call_count
        call_count += 1
        if "preferredai" in url:
            content = plamo_ideas
        else:
            content = xai_bad_candidates
        return SimpleNamespace(
            status_code=200,
            json=lambda content=content: {"choices": [{"message": {"content": content}}]},
            raise_for_status=lambda: None,
        )

    monkeypatch.setattr("app.services.theme_ai_client.requests.post", fake_post)

    client = PLaMoThemeClient(
        api_key="plamo-key",
        timeout=5.0,
        xai_api_key="xai-key",
        xai_timeout=5.0,
    )
    with pytest.raises(ThemeAIClientError):
        client.generate(category="日常", target_date=date(2025, 1, 11))


def test_plamo_theme_client_raises_on_bad_plamo_payload(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """When PLaMo returns empty response, raises error."""

    def fake_post(url, *args, **kwargs):
        return SimpleNamespace(
            status_code=200,
            json=lambda: {},
            raise_for_status=lambda: None,
        )

    monkeypatch.setattr("app.services.theme_ai_client.requests.post", fake_post)
    client = PLaMoThemeClient(
        api_key="plamo-key",
        xai_api_key="xai-key",
    )

    with pytest.raises(ThemeAIClientError):
        client.generate(category="恋愛", target_date=date(2025, 1, 12))


def test_resolve_theme_ai_client_returns_plamo(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from app.core import config as config_module

    settings = config_module.get_settings()
    monkeypatch.setattr(settings, "theme_ai_provider", "plamo")
    monkeypatch.setattr(settings, "plamo_api_key", "test-plamo-key")
    monkeypatch.setattr(settings, "xai_api_key", "test-xai-key")
    monkeypatch.setattr(settings, "xai_model", "grok-test")
    monkeypatch.setattr(settings, "xai_timeout", 10.0)

    client = resolve_theme_ai_client()
    assert isinstance(client, PLaMoThemeClient)
    assert client.api_key == "test-plamo-key"
    assert client.xai_api_key == "test-xai-key"


def test_resolve_theme_ai_client_plamo_requires_api_key(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from app.core import config as config_module

    settings = config_module.get_settings()
    monkeypatch.setattr(settings, "theme_ai_provider", "plamo")
    monkeypatch.setattr(settings, "plamo_api_key", None)

    with pytest.raises(ThemeAIClientError):
        resolve_theme_ai_client()


def test_resolve_theme_ai_client_plamo_requires_xai_key(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from app.core import config as config_module

    settings = config_module.get_settings()
    monkeypatch.setattr(settings, "theme_ai_provider", "plamo")
    monkeypatch.setattr(settings, "plamo_api_key", "plamo-key")
    monkeypatch.setattr(settings, "xai_api_key", None)

    with pytest.raises(ThemeAIClientError):
        resolve_theme_ai_client()


# ---------------------------------------------------------------------------
# PLaMoWorkClient tests (PLaMo ideation → XAI composition)
# ---------------------------------------------------------------------------


def test_plamo_work_client_pipeline_success(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Full pipeline: PLaMo ideation → XAI composition with valid 7-7."""
    plamo_ideas = "既読つけたまま返事を待つ夜の長さ\n振り向いたら目が合って慌てて逸らす"
    xai_verse = "あなたの声が\n聞こえなくなる"

    fake_post = _make_router(plamo_ideas, xai_verse)
    monkeypatch.setattr("app.services.work_ai_client.requests.post", fake_post)

    client = PLaMoWorkClient(
        api_key="plamo-key",
        timeout=5.0,
        xai_api_key="xai-key",
        xai_timeout=5.0,
    )
    verse = client.generate(
        upper_verse="すれ違う\nいつもの駅で\nまた会えた",
        category="恋愛",
        username="テスト詩人",
    )
    assert verse == "あなたの声が\n聞こえなくなる"


def test_plamo_work_client_retries_on_invalid_mora(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """When XAI produces invalid mora, retries until valid."""
    call_count = 0

    def fake_post(url, *args, **kwargs):
        nonlocal call_count
        call_count += 1
        if "preferredai" in url:
            content = "アイデア: 夜空を見上げる"
        else:
            # First XAI call: invalid (6-7), second: valid (7-7)
            if call_count <= 2:  # 1st=plamo, 2nd=xai(bad)
                content = "声が響く\n聞こえなくなる"
            else:
                content = "あなたの声が\n聞こえなくなる"
        return SimpleNamespace(
            status_code=200,
            json=lambda content=content: {"choices": [{"message": {"content": content}}]},
            raise_for_status=lambda: None,
        )

    monkeypatch.setattr("app.services.work_ai_client.requests.post", fake_post)

    client = PLaMoWorkClient(
        api_key="plamo-key",
        timeout=5.0,
        xai_api_key="xai-key",
        xai_timeout=5.0,
    )
    verse = client.generate(
        upper_verse="すれ違う\nいつもの駅で\nまた会えた",
        category="恋愛",
        username="テスト詩人",
    )
    assert verse == "あなたの声が\n聞こえなくなる"


def test_plamo_work_client_raises_on_bad_payload(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """When PLaMo returns empty response repeatedly, raises error."""
    call_count = 0

    def fake_post(url, *args, **kwargs):
        nonlocal call_count
        call_count += 1
        return SimpleNamespace(
            status_code=200,
            json=lambda: {},
            raise_for_status=lambda: None,
        )

    monkeypatch.setattr("app.services.work_ai_client.requests.post", fake_post)
    client = PLaMoWorkClient(
        api_key="plamo-key",
        timeout=5.0,
        xai_api_key="xai-key",
        xai_timeout=5.0,
    )

    with pytest.raises(WorkAIClientError):
        client.generate(
            upper_verse="すれ違う\nいつもの駅で\nまた会えた",
            category="恋愛",
            username="テスト",
        )


def test_plamo_work_client_uses_persona(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Persona is passed to both PLaMo ideation and XAI composition."""
    captured_payloads: list[dict] = []

    def fake_post(url, *, json=None, headers=None, timeout=None):
        captured_payloads.append({"url": url, "json": json or {}})
        if "preferredai" in url:
            content = "月夜に佇む静かな情景のアイデア"
        else:
            content = "あなたの声が\n聞こえなくなる"
        return SimpleNamespace(
            status_code=200,
            json=lambda content=content: {"choices": [{"message": {"content": content}}]},
            raise_for_status=lambda: None,
        )

    monkeypatch.setattr("app.services.work_ai_client.requests.post", fake_post)

    client = PLaMoWorkClient(
        api_key="plamo-key",
        timeout=5.0,
        xai_api_key="xai-key",
        xai_timeout=5.0,
    )
    client.generate(
        upper_verse="すれ違う\nいつもの駅で\nまた会えた",
        category="恋愛",
        username="月夜のゆき",
        persona="夜や月の美しさ、静かな情景を詠む詩人",
    )

    # PLaMo ideation should include persona
    plamo_call = next(p for p in captured_payloads if "preferredai" in p["url"])
    plamo_system = plamo_call["json"]["messages"][0]["content"]
    assert "夜や月の美しさ" in plamo_system

    # XAI composition should include persona and username
    xai_call = next(p for p in captured_payloads if "x.ai" in p["url"])
    xai_system = xai_call["json"]["messages"][0]["content"]
    assert "月夜のゆき" in xai_system


def test_resolve_work_ai_client_returns_plamo(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from app.core import config as config_module

    settings = config_module.get_settings()
    monkeypatch.setattr(settings, "theme_ai_provider", "plamo")
    monkeypatch.setattr(settings, "plamo_api_key", "test-plamo-key")
    monkeypatch.setattr(settings, "xai_api_key", "test-xai-key")

    client = resolve_work_ai_client()
    assert isinstance(client, PLaMoWorkClient)
    assert client.api_key == "test-plamo-key"
    assert client.xai_api_key == "test-xai-key"


def test_resolve_work_ai_client_plamo_requires_api_key(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from app.core import config as config_module

    settings = config_module.get_settings()
    monkeypatch.setattr(settings, "theme_ai_provider", "plamo")
    monkeypatch.setattr(settings, "plamo_api_key", None)

    with pytest.raises(WorkAIClientError):
        resolve_work_ai_client()


def test_resolve_work_ai_client_plamo_requires_xai_key(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from app.core import config as config_module

    settings = config_module.get_settings()
    monkeypatch.setattr(settings, "theme_ai_provider", "plamo")
    monkeypatch.setattr(settings, "plamo_api_key", "plamo-key")
    monkeypatch.setattr(settings, "xai_api_key", None)

    with pytest.raises(WorkAIClientError):
        resolve_work_ai_client()
