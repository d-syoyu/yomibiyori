"""AI client implementations for theme generation."""

from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import date
from typing import Protocol

import requests

from app.core.config import get_settings


class ThemeAIClientError(RuntimeError):
    """Raised when an AI client cannot produce a valid theme."""


def count_syllables(text: str) -> int:
    """Count the number of syllables (音数) in Japanese text.

    Counts hiragana and katakana characters as syllables.
    Ignores whitespace, punctuation, and kanji.

    Args:
        text: Japanese text to count syllables in

    Returns:
        Number of syllables (mora count)
    """
    # Remove whitespace and common punctuation
    text = re.sub(r'[\s\u3000。、！？]', '', text)

    # Count hiragana (U+3040 to U+309F) and katakana (U+30A0 to U+30FF)
    # This includes small kana (ゃ, ゅ, ょ, っ, etc.) and long vowel mark (ー)
    syllables = 0
    for char in text:
        if '\u3040' <= char <= '\u309F' or '\u30A0' <= char <= '\u30FF':
            syllables += 1

    return syllables


def validate_575(text: str) -> tuple[bool, list[int]]:
    """Validate that a haiku follows the 5-7-5 syllable pattern.

    Args:
        text: Haiku text with lines separated by newlines

    Returns:
        Tuple of (is_valid, syllable_counts)
        - is_valid: True if the haiku is exactly 5-7-5
        - syllable_counts: List of syllable counts for each line
    """
    lines = text.strip().split('\n')

    # Must have exactly 3 lines
    if len(lines) != 3:
        return False, []

    counts = [count_syllables(line) for line in lines]
    is_valid = counts == [5, 7, 5]

    return is_valid, counts


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
        """Generate a haiku theme with 5-7-5 syllable validation.

        Retries up to MAX_RETRIES times if the generated haiku does not match 5-7-5.
        """
        MAX_RETRIES = 3

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
                    "content": "恋愛をテーマに、下の句で完結する5-7-5の上の句を作ってください。音数を数えてから作ってください。"
                },
                {
                    "role": "assistant",
                    "content": "カフェデート（カ1フェ2デ3ー4ト5）\nきみのえがおを（き1み2の3え4が5お6を7）\nみつめてる（み1つ2め3て4る5）"
                },
                {
                    "role": "user",
                    "content": "季節をテーマに、下の句で完結する5-7-5の上の句を作ってください。音数を数えてから作ってください。"
                },
                {
                    "role": "assistant",
                    "content": "さくらさく（さ1く2ら3さ4く5）\nはるのこうえん（は1る2の3こ4う5え6ん7）\nあるいてる（あ1る2い3て4る5）"
                },
                {
                    "role": "user",
                    "content": "日常をテーマに、下の句で完結する5-7-5の上の句を作ってください。音数を数えてから作ってください。"
                },
                {
                    "role": "assistant",
                    "content": "あさごはん（あ1さ2ご3は4ん5）\nパンをこがして（パ1ン2を3こ4が5し6て7）\nあわててる（あ1わ2て3て4る5）"
                },
                {
                    "role": "user",
                    "content": (
                        f"以下の条件で、ユーザーが下の句を続けたくなる「上の句」を作成してください。\n"
                        f"**作成前に必ず一音ずつ数えて、5-7-5を確認してください。**\n\n"
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
                        f"- 句のみを出力（音数カウント（）は不要、説明も不要）\n"
                        f"- 例の形式: さくらさく\\nはるのこうえん\\nあるいてる"
                    ),
                },
            ],
            "temperature": 0.5,
            "max_tokens": 100,
        }

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        last_content = None
        last_counts = None

        for attempt in range(1, MAX_RETRIES + 1):
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

            content = content.strip()
            is_valid, counts = validate_575(content)

            if is_valid:
                print(f"[Theme generation] Success on attempt {attempt}: {content.replace(chr(10), ' / ')}")  # noqa: T201
                return content

            # Not valid, log and retry
            last_content = content
            last_counts = counts
            print(f"[Theme generation] Attempt {attempt}/{MAX_RETRIES} failed: expected [5,7,5], got {counts} for '{content.replace(chr(10), ' / ')}'")  # noqa: T201

        # All retries exhausted, return last attempt with warning
        print(f"[Theme generation] WARNING: All {MAX_RETRIES} attempts failed. Using last result with syllables {last_counts}: {last_content}")  # noqa: T201
        return last_content or ""


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
