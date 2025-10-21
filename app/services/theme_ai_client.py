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
                        "あなたは音数に精通した現代的でポップな俳句の「上の句」を作る詩人です。\n"
                        "必ず5-7-5の音数を守り、一音一音数えながら作句します。\n"
                        "音数ルール：\n"
                        "- 「っ」「ゃ」「ゅ」「ょ」も1音として数えます\n"
                        "- 「ー」（長音）も1音として数えます\n"
                        "- 例：「コーヒー」=4音（コ・ー・ヒ・ー）、「ラッテ」=3音（ラ・ッ・テ）"
                    ),
                },
                {
                    "role": "user",
                    "content": "恋愛をテーマに、下の句で完結する5-7-5の上の句を作ってください。"
                },
                {
                    "role": "assistant",
                    "content": "カフェデート\nきみのえがおを\nみつめてる"
                },
                {
                    "role": "user",
                    "content": "季節をテーマに、下の句で完結する5-7-5の上の句を作ってください。"
                },
                {
                    "role": "assistant",
                    "content": "さくらさく\nあさのこうえん\nあるいてる"
                },
                {
                    "role": "user",
                    "content": "日常をテーマに、下の句で完結する5-7-5の上の句を作ってください。"
                },
                {
                    "role": "assistant",
                    "content": "あさごはん\nトーストこがして\nあわててる"
                },
                {
                    "role": "user",
                    "content": (
                        f"以下の条件で、ユーザーが下の句を続けたくなる「上の句」を作成してください：\n\n"
                        f"【音数の厳守（最重要）】\n"
                        f"- 1行目：必ず5音（カ・フェ・デー・ト など）\n"
                        f"- 2行目：必ず7音（き・み・の・え・が・お・を など）\n"
                        f"- 3行目：必ず5音（み・つ・め・て・る など）\n\n"
                        f"【各行で意味の区切りを意識（重要）】\n"
                        f"- 1行目：名詞や動詞で完結（例：カフェデート、さくらさく）\n"
                        f"- 2行目：助詞で終わってもOK（例：きみのえがおを、あさのこうえんで）\n"
                        f"- 3行目：動詞で完結（例：みつめてる、あるいてる）\n"
                        f"- 単語の途中で行を区切らない（❌「たべながらみ/てる」など）\n\n"
                        f"【重要：下の句で完結させる】\n"
                        f"- 上の句では完結させず、余韻を残す\n"
                        f"- 情景描写に留め、感情や結論は下の句に委ねる\n"
                        f"- 「〜てる」「〜いる」「〜する」など、続きを想像させる表現を使う\n"
                        f"- ユーザーが「続きを詠みたい！」と思える内容にする\n\n"
                        f"【表現スタイル】\n"
                        f"- 現代的でポップな言葉を使用\n"
                        f"- ひらがな・カタカナを積極的に活用\n"
                        f"- 情景が目に浮かぶ具体的な表現\n"
                        f"- テーマ: {category_instruction}\n\n"
                        f"【出力形式】\n"
                        f"- 必ず3行で出力（1行目5音/2行目7音/3行目5音）\n"
                        f"- 句のみを出力（説明や音数の注釈は不要）"
                    ),
                },
            ],
            "temperature": 0.7,
            "max_tokens": 100,
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
