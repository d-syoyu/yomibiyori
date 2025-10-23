"""AI client implementations for theme generation."""

from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import date
from typing import Protocol

import anthropic
import requests
from pykakasi import kakasi

from app.core.config import get_settings


class ThemeAIClientError(RuntimeError):
    """Raised when an AI client cannot produce a valid theme."""


def count_syllables(text: str) -> int:
    """Count the number of syllables (音数) in Japanese text.

    Converts kanji to hiragana using pykakasi, then counts mora.
    Counts hiragana and katakana characters as syllables.

    Args:
        text: Japanese text to count syllables in (can include kanji)

    Returns:
        Number of syllables (mora count)
    """
    # Remove whitespace and common punctuation
    text = re.sub(r'[\s\u3000。、！？]', '', text)

    # Convert kanji to hiragana using pykakasi
    kks = kakasi()
    result = kks.convert(text)
    hiragana_text = ''.join([item['hira'] for item in result])

    # Count hiragana and katakana characters
    # This includes small kana (ゃ, ゅ, ょ, っ, etc.) and long vowel mark (ー)
    syllables = 0
    for char in hiragana_text:
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
                        "あなたは音数（モーラ数）に精通した現代的でポップな俳句の「上の句」を作る詩人です。\n"
                        "必ず5-7-5の音数を守り、一音一音数えながら作句します。\n\n"
                        "【重要：音数カウントルール】\n"
                        "以下すべて1音（1モーラ）として数えます：\n"
                        "1. 通常の仮名：「あ」「か」「さ」など → 各1音\n"
                        "2. 促音「っ」 → 1音（例：がっこう=4音）\n"
                        "3. 撥音「ん」 → 1音（例：さんぽ=3音）\n"
                        "4. 長音「ー」 → 1音（例：コーヒー=4音）\n"
                        "5. 拗音「きゃ」「しょ」「ちゅ」 → 各1音\n"
                        "6. 小さい「ゃゅょ」 → 前の文字と合わせて1音\n\n"
                        "注意：文字数≠音数です。音数で数えてください。"
                    ),
                },
                {
                    "role": "user",
                    "content": "恋愛をテーマに、下の句で完結する5-7-5の上の句を作ってください。音数を数えてから作ってください。"
                },
                {
                    "role": "assistant",
                    "content": "カフェデート（カ1フェ2デ3ー4ト5）\n君の笑顔を（き1み2の3え4が5お6を7）\n見つめてる（み1つ2め3て4る5）"
                },
                {
                    "role": "user",
                    "content": "季節をテーマに、下の句で完結する5-7-5の上の句を作ってください。音数を数えてから作ってください。"
                },
                {
                    "role": "assistant",
                    "content": "桜咲く（さ1く2ら3さ4く5）\n春の公園（は1る2の3こ4う5え6ん7）\n歩いてる（あ1る2い3て4る5）"
                },
                {
                    "role": "user",
                    "content": "日常をテーマに、下の句で完結する5-7-5の上の句を作ってください。音数を数えてから作ってください。"
                },
                {
                    "role": "assistant",
                    "content": "朝ごはん（あ1さ2ご3は4ん5）\nパンを焦がして（パ1ン2を3こ4が5し6て7）\n慌ててる（あ1わ2て3て4る5）"
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
                        f"【表現の自然さ】\n"
                        f"- 文章の流れを優先し、各行で意味が途切れても構いません\n"
                        f"- 名詞、動詞、助詞など、どの品詞で行が終わっても自由に表現してください\n"
                        f"- ただし、単語の途中で行を区切ることは避けてください（例：「たべ/ながら」はNG）\n\n"
                        f"【重要：下の句で完結させる】\n"
                        f"- 上の句では完結させず、余韻を残す\n"
                        f"- 情景描写に留め、感情や結論は下の句に委ねる\n"
                        f"- 「〜てる」「〜いる」「〜する」など、続きを想像させる表現を使う\n"
                        f"- ユーザーが「続きを詠みたい！」と思える内容にする\n\n"
                        f"【表現スタイル】\n"
                        f"- 現代的でポップな言葉を使用\n"
                        f"- ひらがな・カタカナ・漢字を自然にミックス\n"
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

            lines = content.split('\n')
            lines_detail = " | ".join([f"'{line}' ({count})" for line, count in zip(lines, counts if counts else [])])

            if is_valid:
                print(f"[Theme generation] [OK] Success on attempt {attempt}: {lines_detail}")  # noqa: T201
                return content

            # Not valid, log and retry
            last_content = content
            last_counts = counts
            print(f"[Theme generation] [FAIL] Attempt {attempt}/{MAX_RETRIES} failed: expected [5,7,5], got {counts}")  # noqa: T201
            print(f"[Theme generation]    Lines: {lines_detail}")  # noqa: T201

        # All retries exhausted, return last attempt with warning
        print(f"[Theme generation] WARNING: All {MAX_RETRIES} attempts failed. Using last result with syllables {last_counts}: {last_content}")  # noqa: T201
        return last_content or ""


@dataclass(slots=True)
class XAIThemeClient(ThemeAIClient):
    """X.ai Grok-backed theme generator (OpenAI-compatible API)."""

    api_key: str
    model: str = "grok-4-fast-reasoning"
    endpoint: str = "https://api.x.ai/v1/chat/completions"
    timeout: float = 30.0

    # カテゴリー別のプロンプト定義（ClaudeThemeClientと同じ）
    CATEGORY_PROMPTS = {
        "恋愛": "片思いの切なさ、初デートのドキドキ、すれ違い、告白の勇気、禁断の恋、失恋の痛み、運命の出会いなど、ドラマチックで心に刺さる恋愛シーンを。ありきたりな表現を避け、鮮やかで意外性のある情景を。",
        "季節": "桜吹雪、夕立、紅葉、雪の朝、梅雨のにおい、夏の夕焼け、秋の虫の声など、季節の一瞬を鮮やかに切り取る。五感で感じる季節感を具体的に。ありきたりな表現を避け、新鮮な視点で。",
        "日常": "通勤電車の偶然、コンビニの発見、深夜のLINE、休日の二度寝、朝のコーヒー、忘れ物に気づく瞬間など、日常の小さなドラマを。平凡に見える日常に潜む詩的な一瞬を切り取って。",
        "ユーモア": "失敗あるある、勘違い、思わず笑える瞬間、ツッコミたくなる光景、予想外の展開、自虐ネタなど、クスッと笑える日常を。意外性とウィットを効かせて。",
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
                        "あなたは音数（モーラ数）に精通した現代的でポップな俳句の「上の句」を作る詩人です。\n"
                        "必ず5-7-5の音数を守り、一音一音数えながら作句します。\n\n"
                        "【重要：音数カウントルール】\n"
                        "以下すべて1音（1モーラ）として数えます：\n"
                        "1. 通常の仮名：「あ」「か」「さ」など → 各1音\n"
                        "2. 促音「っ」 → 1音（例：がっこう=4音）\n"
                        "3. 撥音「ん」 → 1音（例：さんぽ=3音）\n"
                        "4. 長音「ー」 → 1音（例：コーヒー=4音）\n"
                        "5. 拗音「きゃ」「しょ」「ちゅ」 → 各1音\n"
                        "6. 小さい「ゃゅょ」 → 前の文字と合わせて1音\n\n"
                        "注意：文字数≠音数です。音数で数えてください。"
                    ),
                },
                {
                    "role": "user",
                    "content": "恋愛をテーマに、下の句で完結する5-7-5の上の句を作ってください。音数を数えてから作ってください。"
                },
                {
                    "role": "assistant",
                    "content": "カフェデート\n君の笑顔を\n見つめてる"
                },
                {
                    "role": "user",
                    "content": (
                        f"以下の条件で、ユーザーが思わず下の句を続けたくなる「上の句」を作成してください。\n"
                        f"**作成前に必ず一音ずつ数えて、5-7-5を確認してください。**\n\n"
                        f"【音数の厳守（最重要）】\n"
                        f"- 1行目：必ず5音\n"
                        f"- 2行目：必ず7音\n"
                        f"- 3行目：必ず5音\n\n"
                        f"【表現の自然さ】\n"
                        f"- 文章の流れを優先し、各行で意味が途切れても構いません\n"
                        f"- 名詞、動詞、助詞など、どの品詞で行が終わっても自由に表現してください\n"
                        f"- ただし、単語の途中で行を区切ることは避けてください（例：「たべ/ながら」はNG）\n\n"
                        f"【重要：下の句で完結させる】\n"
                        f"- 上の句では完結させず、余韻を残す\n"
                        f"- 情景描写に留め、感情や結論は下の句に委ねる\n"
                        f"- ユーザーが「続きを詠みたい！」と心から思える、意外性のある展開を\n\n"
                        f"【表現スタイル（多様性・意外性重視）】\n"
                        f"- ありきたりな表現を避け、新鮮で意外性のある言葉選びを\n"
                        f"- 現代的でポップな言葉を使用\n"
                        f"- テーマ: {category_instruction}\n\n"
                        f"【出力形式】\n"
                        f"- 必ず3行で出力（1行目5音/2行目7音/3行目5音）\n"
                        f"- 句のみを出力（音数カウント（）は不要、説明も不要）"
                    ),
                },
            ],
            "temperature": 0.9,
            "max_tokens": 200,
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
                raise ThemeAIClientError("Failed to call X.ai API endpoint") from exc

            try:
                response.raise_for_status()
            except requests.HTTPError as exc:
                raise ThemeAIClientError(f"X.ai API returned {response.status_code}") from exc

            try:
                payload_json = response.json()
            except ValueError as exc:
                raise ThemeAIClientError("X.ai API returned invalid JSON") from exc

            try:
                content = payload_json["choices"][0]["message"]["content"]
            except (KeyError, IndexError, TypeError) as exc:
                raise ThemeAIClientError("X.ai API response missing message content") from exc

            content = content.strip()
            is_valid, counts = validate_575(content)

            lines = content.split('\n')
            lines_detail = " | ".join([f"'{line}' ({count})" for line, count in zip(lines, counts if counts else [])])

            if is_valid:
                print(f"[Theme generation] [OK] Success on attempt {attempt}: {lines_detail}")  # noqa: T201
                return content

            # Not valid, log and retry
            last_content = content
            last_counts = counts
            print(f"[Theme generation] [FAIL] Attempt {attempt}/{MAX_RETRIES} failed: expected [5,7,5], got {counts}")  # noqa: T201
            print(f"[Theme generation]    Lines: {lines_detail}")  # noqa: T201

        # All retries exhausted, return last attempt with warning
        print(f"[Theme generation] WARNING: All {MAX_RETRIES} attempts failed. Using last result with syllables {last_counts}: {last_content}")  # noqa: T201
        return last_content or ""


@dataclass(slots=True)
class ClaudeThemeClient(ThemeAIClient):
    """Anthropic Claude-backed theme generator."""

    api_key: str
    model: str = "claude-sonnet-4-5-20250929"
    timeout: float = 30.0

    # カテゴリー別のプロンプト定義（改善版：多様性・意外性重視）
    CATEGORY_PROMPTS = {
        "恋愛": "片思いの切なさ、初デートのドキドキ、すれ違い、告白の勇気、禁断の恋、失恋の痛み、運命の出会いなど、ドラマチックで心に刺さる恋愛シーンを。ありきたりな表現を避け、鮮やかで意外性のある情景を。",
        "季節": "桜吹雪、夕立、紅葉、雪の朝、梅雨のにおい、夏の夕焼け、秋の虫の声など、季節の一瞬を鮮やかに切り取る。五感で感じる季節感を具体的に。ありきたりな表現を避け、新鮮な視点で。",
        "日常": "通勤電車の偶然、コンビニの発見、深夜のLINE、休日の二度寝、朝のコーヒー、忘れ物に気づく瞬間など、日常の小さなドラマを。平凡に見える日常に潜む詩的な一瞬を切り取って。",
        "ユーモア": "失敗あるある、勘違い、思わず笑える瞬間、ツッコミたくなる光景、予想外の展開、自虐ネタなど、クスッと笑える日常を。意外性とウィットを効かせて。",
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

        # システムプロンプト
        system_prompt = (
            "あなたは音数（モーラ数）に精通した現代的でポップな俳句の「上の句」を作る詩人です。\n"
            "必ず5-7-5の音数を守り、一音一音数えながら作句します。\n\n"
            "【重要：音数カウントルール】\n"
            "以下すべて1音（1モーラ）として数えます：\n"
            "1. 通常の仮名：「あ」「か」「さ」など → 各1音\n"
            "2. 促音「っ」 → 1音（例：がっこう=4音）\n"
            "3. 撥音「ん」 → 1音（例：さんぽ=3音）\n"
            "4. 長音「ー」 → 1音（例：コーヒー=4音）\n"
            "5. 拗音「きゃ」「しょ」「ちゅ」 → 各1音\n"
            "6. 小さい「ゃゅょ」 → 前の文字と合わせて1音\n\n"
            "注意：文字数≠音数です。音数で数えてください。"
        )

        # ユーザープロンプト（改善版：多様性・意外性重視）
        user_prompt = (
            f"以下の条件で、ユーザーが思わず下の句を続けたくなる「上の句」を作成してください。\n"
            f"**作成前に必ず一音ずつ数えて、5-7-5を確認してください。**\n\n"
            f"【音数の厳守（最重要）】\n"
            f"- 1行目：必ず5音（カ・フェ・デー・ト など）\n"
            f"- 2行目：必ず7音（き・み・の・え・が・お・を など）\n"
            f"- 3行目：必ず5音（み・つ・め・て・る など）\n\n"
            f"【表現の自然さ】\n"
            f"- 文章の流れを優先し、各行で意味が途切れても構いません\n"
            f"- 名詞、動詞、助詞など、どの品詞で行が終わっても自由に表現してください\n"
            f"- ただし、単語の途中で行を区切ることは避けてください（例：「たべ/ながら」はNG）\n\n"
            f"【重要：下の句で完結させる】\n"
            f"- 上の句では完結させず、余韻を残す\n"
            f"- 情景描写に留め、感情や結論は下の句に委ねる\n"
            f"- 動詞（〜てる、〜いる）、形容詞（〜そうで、〜ない）、過去形（〜だった）など、多様な終わり方で続きを想像させる\n"
            f"- ユーザーが「続きを詠みたい！」と心から思える、意外性のある展開を\n\n"
            f"【表現スタイル（多様性・意外性重視）】\n"
            f"- ありきたりな表現を避け、新鮮で意外性のある言葉選びを\n"
            f"- 現代的でポップな言葉を使用（SNS、カフェ、スマホなどもOK）\n"
            f"- ひらがな・カタカナ・漢字を自然にミックス\n"
            f"- 五感に訴える具体的で鮮やかな情景描写\n"
            f"- 感情の機微や心の動きを繊細に表現\n"
            f"- テーマ: {category_instruction}\n\n"
            f"【出力形式】\n"
            f"- 必ず3行で出力（1行目5音/2行目7音/3行目5音）\n"
            f"- 句のみを出力（音数カウント（）は不要、説明も不要）\n"
            f"- 例の形式: さくらさく\\nはるのこうえん\\nあるいてる"
        )

        client = anthropic.Anthropic(api_key=self.api_key, timeout=self.timeout)

        # Few-shot examples（多様性を示す）
        few_shot_messages = [
            {"role": "user", "content": "恋愛をテーマに、下の句で完結する5-7-5の上の句を作ってください。"},
            {"role": "assistant", "content": "カフェデート\n君の笑顔を\n見つめてる"},
            {"role": "user", "content": "恋愛をテーマに、別の終わり方で5-7-5の上の句を作ってください。"},
            {"role": "assistant", "content": "別れ道\n振り返ったら\n泣きそうで"},
            {"role": "user", "content": "季節をテーマに、下の句で完結する5-7-5の上の句を作ってください。"},
            {"role": "assistant", "content": "桜咲く\n春の公園\n歩いてる"},
            {"role": "user", "content": "日常をテーマに、過去形で終わる5-7-5の上の句を作ってください。"},
            {"role": "assistant", "content": "朝ごはん\nパンを焦がして\n慌てた"},
            {"role": "user", "content": "ユーモアをテーマに、5-7-5の上の句を作ってください。"},
            {"role": "assistant", "content": "スマホ見て\n改札通れず\n立ち止まる"},
        ]

        last_content = None
        last_counts = None

        for attempt in range(1, MAX_RETRIES + 1):
            try:
                message = client.messages.create(
                    model=self.model,
                    max_tokens=200,
                    temperature=0.9,
                    system=system_prompt,
                    messages=few_shot_messages + [
                        {"role": "user", "content": user_prompt}
                    ]
                )
            except Exception as exc:  # pragma: no cover - network failure path
                raise ThemeAIClientError("Failed to call Anthropic API") from exc

            # Extract text content
            content = ""
            for block in message.content:
                if block.type == "text":
                    content += block.text

            content = content.strip()
            is_valid, counts = validate_575(content)

            lines = content.split('\n')
            lines_detail = " | ".join([f"'{line}' ({count})" for line, count in zip(lines, counts if counts else [])])

            if is_valid:
                print(f"[Theme generation] [OK] Success on attempt {attempt}: {lines_detail}")  # noqa: T201
                return content

            # Not valid, log and retry
            last_content = content
            last_counts = counts
            print(f"[Theme generation] [FAIL] Attempt {attempt}/{MAX_RETRIES} failed: expected [5,7,5], got {counts}")  # noqa: T201
            print(f"[Theme generation]    Lines: {lines_detail}")  # noqa: T201

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

    if provider == "claude":
        api_key = settings.anthropic_api_key
        if not api_key:
            raise ThemeAIClientError("ANTHROPIC_API_KEY is not configured")
        return ClaudeThemeClient(
            api_key=api_key,
            model=settings.claude_model,
            timeout=settings.claude_timeout,
        )

    if provider == "xai":
        api_key = settings.xai_api_key
        if not api_key:
            raise ThemeAIClientError("XAI_API_KEY is not configured")
        return XAIThemeClient(
            api_key=api_key,
            model=settings.xai_model,
            timeout=settings.xai_timeout,
        )

    return DummyThemeAIClient()
