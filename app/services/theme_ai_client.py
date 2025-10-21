"""AI client implementations for theme generation."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from typing import Protocol

import requests

from app.core.config import get_settings


class ThemeAIClientError(RuntimeError):
    """Raised when an AI client cannot produce a valid theme."""


class ThemeAIClient(Protocol):
    """Protocol describing theme generation clients."""

    def generate(self, *, category: str, target_date: date) -> str:
        """Return a generated theme for the given category and date."""


@dataclass(slots=True)
class DummyThemeAIClient(ThemeAIClient):
    """Fallback AI client returning deterministic strings."""

    prefix: str = "Placeholder theme"

    def generate(self, *, category: str, target_date: date) -> str:
        return f"{self.prefix} for {category} on {target_date.isoformat()}"


@dataclass(slots=True)
class OpenAIThemeClient(ThemeAIClient):
    """OpenAI Chat Completions-backed theme generator."""

    api_key: str
    model: str = "gpt-4o-mini"
    endpoint: str = "https://api.openai.com/v1/chat/completions"
    timeout: float = 10.0

    # カテゴリー別のプロンプト定義
    CATEGORY_PROMPTS = {
        "恋愛": "恋愛・片思い・ときめき・デート・カップルなど、恋にまつわるシーンを現代的でポップに表現してください。",
        "季節": "春夏秋冬の季節感、天気、自然の移り変わりを明るく爽やかに表現してください。",
        "日常": "日常生活、通勤・通学、食事、趣味など、身近な瞬間を親しみやすく表現してください。",
        "ユーモア": "クスッと笑える日常のあるある、ちょっとした失敗、面白い発見などをユーモラスに表現してください。",
    }

    def generate(self, *, category: str, target_date: date) -> str:
        # カテゴリーに応じたプロンプトを取得
        category_instruction = self.CATEGORY_PROMPTS.get(
            category,
            f"「{category}」というテーマで現代的な表現を使ってください。"
        )

        payload = {
            "model": self.model,
            "messages": [
                {
                    "role": "system",
                    "content": (
                        "あなたは現代的でポップな俳句の「上の句」を作る詩人です。"
                        "若者にも親しみやすい、明るくリズミカルな表現を使います。"
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        f"以下の条件で俳句の「上の句」を1つ作成してください：\n\n"
                        f"【必須条件】\n"
                        f"1. **5-7-5の音数を厳守**してください（例：さくら咲く(5) / 君との約束(7) / 春の風(5)）\n"
                        f"2. 現代的でポップな表現を使ってください\n"
                        f"3. 情景が目に浮かぶような具体的な言葉を選んでください\n"
                        f"4. テーマ: {category_instruction}\n\n"
                        f"【出力形式】\n"
                        f"- 5-7-5の形式で改行を含めて出力してください\n"
                        f"- 余計な説明は一切不要です\n"
                        f"- 句だけを出力してください"
                    ),
                },
            ],
            "temperature": 0.9,
            "max_tokens": 80,
        }

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        try:
            response = requests.post(self.endpoint, json=payload, headers=headers, timeout=self.timeout)
        except requests.RequestException as exc:  # pragma: no cover - network failure path
            raise ThemeAIClientError("Failed to call OpenAI completions endpoint") from exc

        try:
            response.raise_for_status()
        except requests.HTTPError as exc:
            raise ThemeAIClientError(f"OpenAI API returned {response.status_code}") from exc

        try:
            payload_json = response.json()
        except ValueError as exc:
            raise ThemeAIClientError("OpenAI API returned invalid JSON") from exc

        try:
            content = payload_json["choices"][0]["message"]["content"]
        except (KeyError, IndexError, TypeError) as exc:
            raise ThemeAIClientError("OpenAI API response missing message content") from exc

        return content.strip()


def resolve_theme_ai_client() -> ThemeAIClient:
    """Return the theme AI client configured for the current environment."""

    settings = get_settings()
    provider = (settings.theme_ai_provider or "dummy").lower()

    if provider == "openai":
        api_key = settings.openai_api_key
        if not api_key:
            raise ThemeAIClientError("OPENAI_API_KEY is not configured")
        return OpenAIThemeClient(
            api_key=api_key,
            model=settings.openai_model,
            timeout=settings.openai_timeout,
        )

    return DummyThemeAIClient()
