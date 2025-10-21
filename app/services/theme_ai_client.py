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
    prompt_template: str = (
        "You are a creative haiku prompt designer. Create a short upper verse (3-20 words) in Japanese for "
        "a daily haiku challenge. The theme category is '{category}'. "
        "Return only the verse text without additional commentary."
    )

    def generate(self, *, category: str, target_date: date) -> str:
        payload = {
            "model": self.model,
            "messages": [
                {
                    "role": "system",
                    "content": "You craft poetic prompts in Japanese with a gentle, seasonal tone.",
                },
                {
                    "role": "user",
                    "content": self.prompt_template.format(category=category, date=target_date.isoformat()),
                },
            ],
            "temperature": 0.8,
            "max_tokens": 60,
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
