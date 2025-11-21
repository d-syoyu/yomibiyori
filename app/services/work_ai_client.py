"""AI client implementations for sample work (lower verse) generation."""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Protocol

import anthropic
import requests

from app.core.config import get_settings
from app.services.theme_ai_client import count_syllables


class WorkAIClientError(RuntimeError):
    """Raised when an AI client cannot produce a valid lower verse."""


def validate_77(text: str) -> tuple[bool, list[int]]:
    """Validate that a lower verse follows the 7-7 syllable pattern.

    Args:
        text: Lower verse text with lines separated by newlines

    Returns:
        Tuple of (is_valid, syllable_counts)
        - is_valid: True if the verse is exactly 7-7
        - syllable_counts: List of syllable counts for each line
    """
    lines = text.strip().split('\n')

    # Must have exactly 2 lines
    if len(lines) != 2:
        return False, []

    counts = [count_syllables(line) for line in lines]
    is_valid = counts == [7, 7]

    return is_valid, counts


class WorkAIClient(Protocol):
    """Protocol describing work (lower verse) generation clients."""

    def generate(self, *, upper_verse: str, category: str, username: str, persona: str = "") -> str:
        """Return a generated lower verse for the given upper verse and category."""


@dataclass(slots=True)
class OpenAIWorkClient(WorkAIClient):
    """OpenAI Chat Completions-backed lower verse generator."""

    api_key: str
    model: str = "gpt-4o-mini"
    endpoint: str = "https://api.openai.com/v1/chat/completions"
    timeout: float = 10.0

    # カテゴリ別の下の句スタイルガイド
    CATEGORY_STYLES = {
        "恋愛": "切ない余韻、ドキドキする展開、意外な心情の吐露など、読む人の恋心を揺さぶる表現で。",
        "季節": "季節の移ろいに重ねた心情、五感で感じる情景、自然と心の共鳴を描いて。",
        "日常": "「わかる！」と共感を呼ぶ展開、クスッと笑える発見、ほっこりする結末で。",
        "ユーモア": "予想外のオチ、ツッコミどころ満載の展開、笑いを誘う大胆な表現で締めくくって。",
    }

    def generate(self, *, upper_verse: str, category: str, username: str) -> str:
        """Generate a 7-7 lower verse with syllable validation."""
        MAX_RETRIES = 3

        # カテゴリに応じたスタイルガイド
        style_guide = self.CATEGORY_STYLES.get(
            category,
            "読む人の想像力を刺激する、印象的な表現で完結させて。"
        )

        payload = {
            "model": self.model,
            "messages": [
                {
                    "role": "system",
                    "content": (
                        "あなたは音数（モーラ数）に精通した現代的な詩人です。\n"
                        "上の句（5-7-5）を受け取り、下の句（7-7）で完結させます。\n"
                        "必ず7-7の音数を守り、一音一音数えながら作句します。\n\n"
                        "【重要な心得】\n"
                        "- ありきたりな表現は避ける\n"
                        "- 読む人の心に残る、個性的な言葉選びを\n"
                        "- 予定調和を裏切る、意外性のある展開を\n"
                        "- 余韻や含みを持たせる深い表現を"
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        f"以下の上の句に対して、下の句（7-7）を作成してください。\n"
                        f"**作成前に必ず一音ずつ数えて、7-7を厳密に確認してください。**\n\n"
                        f"【上の句】\n{upper_verse}\n\n"
                        f"【カテゴリ】{category}\n"
                        f"【このカテゴリでの表現スタイル】\n{style_guide}\n\n"
                        f"【音数の厳守（絶対条件）】\n"
                        f"- 1行目：必ず正確に7音\n"
                        f"- 2行目：必ず正確に7音\n"
                        f"- 音数が合わない句は絶対に出力しないでください\n\n"
                        f"【表現の工夫】\n"
                        f"- 常套句や決まり文句を避ける\n"
                        f"- 具体的で鮮やかな描写を\n"
                        f"- 読み手の想像力を刺激する言葉を\n"
                        f"- 心に刺さる、印象的なフレーズで締めくくる\n\n"
                        f"【出力形式】\n"
                        f"- 必ず2行（1行目7音/2行目7音）\n"
                        f"- 句のみ出力（音数カウントや説明は不要）"
                    ),
                },
            ],
            "temperature": 1.1,
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
            except requests.RequestException as exc:
                raise WorkAIClientError("Failed to call OpenAI completions endpoint") from exc

            try:
                response.raise_for_status()
            except requests.HTTPError as exc:
                raise WorkAIClientError(f"OpenAI API returned {response.status_code}") from exc

            try:
                payload_json = response.json()
            except ValueError as exc:
                raise WorkAIClientError("OpenAI API returned invalid JSON") from exc

            try:
                content = payload_json["choices"][0]["message"]["content"]
            except (KeyError, IndexError, TypeError) as exc:
                raise WorkAIClientError("OpenAI API response missing message content") from exc

            content = content.strip()
            is_valid, counts = validate_77(content)

            lines = content.split('\n')
            lines_detail = " | ".join([f"'{line}' ({count})" for line, count in zip(lines, counts if counts else [])])

            if is_valid:
                print(f"[Work generation] [OK] Success on attempt {attempt}: {lines_detail}")
                return content

            # Not valid, log and retry
            last_content = content
            last_counts = counts
            print(f"[Work generation] [FAIL] Attempt {attempt}/{MAX_RETRIES} failed: expected [7,7], got {counts}")
            print(f"[Work generation]    Lines: {lines_detail}")

        # All retries exhausted, return last attempt with warning
        print(f"[Work generation] WARNING: All {MAX_RETRIES} attempts failed. Using last result with syllables {last_counts}: {last_content}")
        return last_content or ""


@dataclass(slots=True)
class XAIWorkClient(WorkAIClient):
    """X.ai Grok-backed lower verse generator."""

    api_key: str
    model: str = "grok-4-1-fast-reasoning"
    endpoint: str = "https://api.x.ai/v1/chat/completions"
    timeout: float = 30.0

    # カテゴリ別の下の句スタイルガイド（OpenAIと統一）
    CATEGORY_STYLES = {
        "恋愛": "切ない余韻、ドキドキする展開、意外な心情の吐露など、読む人の恋心を揺さぶる表現で。",
        "季節": "季節の移ろいに重ねた心情、五感で感じる情景、自然と心の共鳴を描いて。",
        "日常": "「わかる！」と共感を呼ぶ展開、クスッと笑える発見、ほっこりする結末で。",
        "ユーモア": "予想外のオチ、ツッコミどころ満載の展開、笑いを誘う大胆な表現で締めくくって。",
    }

    def generate(self, *, upper_verse: str, category: str, username: str, persona: str = "") -> str:
        """Generate a 7-7 lower verse with syllable validation."""
        MAX_RETRIES = 3

        # ペルソナが指定されていない場合はユーザー名をそのまま使用
        if not persona:
            persona = f"「{username}」という名前の詩人として、あなた独自の感性で表現します。"

        # カテゴリに応じたスタイルガイド
        style_guide = self.CATEGORY_STYLES.get(
            category,
            "読む人の想像力を刺激する、印象的な表現で完結させて。"
        )

        payload = {
            "model": self.model,
            "messages": [
                {
                    "role": "system",
                    "content": (
                        f"あなたは音数（モーラ数）に精通した現代的な詩人「{username}」です。\n"
                        f"ペルソナ: {persona}\n\n"
                        "上の句（5-7-5）を受け取り、下の句（7-7）で完結させます。\n"
                        "必ず7-7の音数を守り、一音一音数えながら作句します。\n\n"
                        "【重要な心得】\n"
                        "- ありきたりな表現は避ける\n"
                        "- 読む人の心に残る、個性的な言葉選びを\n"
                        "- 予定調和を裏切る、意外性のある展開を\n"
                        "- 余韻や含みを持たせる深い表現を\n"
                        "- あなたのペルソナを活かした独自の視点で"
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        f"以下の上の句に対して、下の句（7-7）を作成してください。\n"
                        f"**作成前に必ず一音ずつ数えて、7-7を厳密に確認してください。**\n\n"
                        f"【上の句】\n{upper_verse}\n\n"
                        f"【カテゴリ】{category}\n"
                        f"【このカテゴリでの表現スタイル】\n{style_guide}\n\n"
                        f"【あなたのペルソナ】\n{persona}\n\n"
                        f"【音数の厳守（絶対条件）】\n"
                        f"- 1行目：必ず正確に7音\n"
                        f"- 2行目：必ず正確に7音\n"
                        f"- 音数が合わない句は絶対に出力しないでください\n\n"
                        f"【表現の工夫】\n"
                        f"- 常套句や決まり文句を避ける\n"
                        f"- 具体的で鮮やかな描写を\n"
                        f"- 読み手の想像力を刺激する言葉を\n"
                        f"- 心に刺さる、印象的なフレーズで締めくくる\n\n"
                        f"【出力形式】\n"
                        f"- 必ず2行（1行目7音/2行目7音）\n"
                        f"- 句のみ出力（音数カウントや説明は不要）"
                    ),
                },
            ],
            "temperature": 1.2,
            "max_tokens": 200,
        }

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        last_content = None
        last_counts = None
        last_error = None

        for attempt in range(1, MAX_RETRIES + 1):
            try:
                response = requests.post(self.endpoint, json=payload, headers=headers, timeout=self.timeout)
            except requests.RequestException as exc:
                last_error = f"Network error: {exc}"
                print(f"[Work generation] [FAIL] Attempt {attempt}/{MAX_RETRIES} - Network error: {exc}")
                if attempt == MAX_RETRIES:
                    raise WorkAIClientError(f"Failed to call X.ai API endpoint after {MAX_RETRIES} attempts: {exc}") from exc
                continue

            try:
                response.raise_for_status()
            except requests.HTTPError as exc:
                last_error = f"HTTP {response.status_code}: {response.text[:200]}"
                print(f"[Work generation] [FAIL] Attempt {attempt}/{MAX_RETRIES} - HTTP error: {response.status_code}")
                if attempt == MAX_RETRIES:
                    raise WorkAIClientError(f"X.ai API returned {response.status_code}") from exc
                continue

            try:
                payload_json = response.json()
            except ValueError as exc:
                last_error = f"Invalid JSON: {exc}"
                print(f"[Work generation] [FAIL] Attempt {attempt}/{MAX_RETRIES} - Invalid JSON response")
                if attempt == MAX_RETRIES:
                    raise WorkAIClientError("X.ai API returned invalid JSON") from exc
                continue

            try:
                content = payload_json["choices"][0]["message"]["content"]
            except (KeyError, IndexError, TypeError) as exc:
                last_error = f"Missing content: {exc}"
                print(f"[Work generation] [FAIL] Attempt {attempt}/{MAX_RETRIES} - Missing message content")
                if attempt == MAX_RETRIES:
                    raise WorkAIClientError("X.ai API response missing message content") from exc
                continue

            content = content.strip()
            is_valid, counts = validate_77(content)

            lines = content.split('\n')
            lines_detail = " | ".join([f"'{line}' ({count})" for line, count in zip(lines, counts if counts else [])])

            if is_valid:
                print(f"[Work generation] [OK] Success on attempt {attempt}: {lines_detail}")
                return content

            # Not valid, log and retry
            last_content = content
            last_counts = counts
            print(f"[Work generation] [FAIL] Attempt {attempt}/{MAX_RETRIES} failed: expected [7,7], got {counts}")
            print(f"[Work generation]    Lines: {lines_detail}")

        # All retries exhausted, return last attempt with warning
        print(f"[Work generation] WARNING: All {MAX_RETRIES} attempts failed. Using last result with syllables {last_counts}: {last_content}")
        return last_content or ""


@dataclass(slots=True)
class ClaudeWorkClient(WorkAIClient):
    """Anthropic Claude-backed lower verse generator."""

    api_key: str
    model: str = "claude-sonnet-4-5-20250929"
    timeout: float = 30.0

    # カテゴリ別の下の句スタイルガイド（OpenAI/XAIと統一）
    CATEGORY_STYLES = {
        "恋愛": "切ない余韻、ドキドキする展開、意外な心情の吐露など、読む人の恋心を揺さぶる表現で。",
        "季節": "季節の移ろいに重ねた心情、五感で感じる情景、自然と心の共鳴を描いて。",
        "日常": "「わかる！」と共感を呼ぶ展開、クスッと笑える発見、ほっこりする結末で。",
        "ユーモア": "予想外のオチ、ツッコミどころ満載の展開、笑いを誘う大胆な表現で締めくくって。",
    }

    def generate(self, *, upper_verse: str, category: str, username: str) -> str:
        """Generate a 7-7 lower verse with syllable validation."""
        MAX_RETRIES = 3

        # カテゴリに応じたスタイルガイド
        style_guide = self.CATEGORY_STYLES.get(
            category,
            "読む人の想像力を刺激する、印象的な表現で完結させて。"
        )

        system_prompt = (
            "あなたは音数（モーラ数）に精通した現代的な詩人です。\n"
            "上の句（5-7-5）を受け取り、下の句（7-7）で完結させます。\n"
            "必ず7-7の音数を守り、一音一音数えながら作句します。\n\n"
            "【重要な心得】\n"
            "- ありきたりな表現は避ける\n"
            "- 読む人の心に残る、個性的な言葉選びを\n"
            "- 予定調和を裏切る、意外性のある展開を\n"
            "- 余韻や含みを持たせる深い表現を"
        )

        user_prompt = (
            f"以下の上の句に対して、下の句（7-7）を作成してください。\n"
            f"**作成前に必ず一音ずつ数えて、7-7を厳密に確認してください。**\n\n"
            f"【上の句】\n{upper_verse}\n\n"
            f"【カテゴリ】{category}\n"
            f"【このカテゴリでの表現スタイル】\n{style_guide}\n\n"
            f"【音数の厳守（絶対条件）】\n"
            f"- 1行目：必ず正確に7音\n"
            f"- 2行目：必ず正確に7音\n"
            f"- 音数が合わない句は絶対に出力しないでください\n\n"
            f"【表現の工夫】\n"
            f"- 常套句や決まり文句を避ける\n"
            f"- 具体的で鮮やかな描写を\n"
            f"- 読み手の想像力を刺激する言葉を\n"
            f"- 心に刺さる、印象的なフレーズで締めくくる\n\n"
            f"【出力形式】\n"
            f"- 必ず2行（1行目7音/2行目7音）\n"
            f"- 句のみ出力（音数カウントや説明は不要）"
        )

        client = anthropic.Anthropic(api_key=self.api_key, timeout=self.timeout)

        last_content = None
        last_counts = None

        for attempt in range(1, MAX_RETRIES + 1):
            try:
                message = client.messages.create(
                    model=self.model,
                    max_tokens=200,
                    temperature=1.1,
                    system=system_prompt,
                    messages=[
                        {"role": "user", "content": user_prompt}
                    ]
                )
            except Exception as exc:
                raise WorkAIClientError("Failed to call Anthropic API") from exc

            # Extract text content
            content = ""
            for block in message.content:
                if block.type == "text":
                    content += block.text

            content = content.strip()
            is_valid, counts = validate_77(content)

            lines = content.split('\n')
            lines_detail = " | ".join([f"'{line}' ({count})" for line, count in zip(lines, counts if counts else [])])

            if is_valid:
                print(f"[Work generation] [OK] Success on attempt {attempt}: {lines_detail}")
                return content

            # Not valid, log and retry
            last_content = content
            last_counts = counts
            print(f"[Work generation] [FAIL] Attempt {attempt}/{MAX_RETRIES} failed: expected [7,7], got {counts}")
            print(f"[Work generation]    Lines: {lines_detail}")

        # All retries exhausted, return last attempt with warning
        print(f"[Work generation] WARNING: All {MAX_RETRIES} attempts failed. Using last result with syllables {last_counts}: {last_content}")
        return last_content or ""


def resolve_work_ai_client() -> WorkAIClient:
    """Return the work AI client configured for the current environment.

    Defaults to XAI (same as theme generation) for consistency.
    """

    settings = get_settings()
    provider = (settings.theme_ai_provider or "xai").lower()

    # XAI is the default and preferred provider (same as theme generation)
    if provider == "xai":
        api_key = settings.xai_api_key
        if not api_key:
            raise WorkAIClientError("XAI_API_KEY is not configured")
        return XAIWorkClient(
            api_key=api_key,
            model=settings.xai_model,
            timeout=settings.xai_timeout,
        )

    if provider == "claude":
        api_key = settings.anthropic_api_key
        if not api_key:
            raise WorkAIClientError("ANTHROPIC_API_KEY is not configured")
        return ClaudeWorkClient(
            api_key=api_key,
            model=settings.claude_model,
            timeout=settings.claude_timeout,
        )

    if provider == "openai":
        api_key = settings.openai_api_key
        if not api_key:
            raise WorkAIClientError("OPENAI_API_KEY is not configured")
        return OpenAIWorkClient(
            api_key=api_key,
            model=settings.openai_model,
            timeout=settings.openai_timeout,
        )

    raise WorkAIClientError(f"Unknown AI provider: {provider}")
