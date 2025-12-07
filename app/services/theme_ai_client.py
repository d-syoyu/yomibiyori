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


def get_season_info(target_date: date) -> str:
    """Get Japanese season name and description based on date."""
    month = target_date.month
    day = target_date.day

    # 二十四節気を考慮した季節判定
    if month == 1:
        return "冬（睦月・1月）。新年の冷たい空気、初詣、雪景色など"
    elif month == 2:
        if day < 4:
            return "冬（如月・2月初旬）。まだ寒さ厳しく、節分の頃"
        else:
            return "晩冬〜早春（如月・2月）。立春を迎え、梅のつぼみが膨らむ頃"
    elif month == 3:
        if day < 21:
            return "早春（弥生・3月）。桃の節句、春の訪れを感じる頃"
        else:
            return "春（弥生・3月下旬）。春分を過ぎ、桜の便りが届く頃"
    elif month == 4:
        return "春（卯月・4月）。桜満開、新生活、花見の季節"
    elif month == 5:
        if day < 6:
            return "晩春（皐月・5月初旬）。ゴールデンウィーク、新緑が眩しい頃"
        else:
            return "初夏（皐月・5月）。立夏を過ぎ、若葉が茂る頃"
    elif month == 6:
        return "梅雨・初夏（水無月・6月）。紫陽花、雨の日、蒸し暑さ"
    elif month == 7:
        if day < 23:
            return "夏（文月・7月）。七夕、蝉の声、梅雨明け間近"
        else:
            return "盛夏（文月・7月下旬）。大暑、本格的な夏の暑さ"
    elif month == 8:
        if day < 23:
            return "盛夏（葉月・8月）。お盆、花火、入道雲、蝉しぐれ"
        else:
            return "晩夏（葉月・8月下旬）。処暑を過ぎ、夏の終わりの気配"
    elif month == 9:
        if day < 23:
            return "初秋（長月・9月）。まだ残暑もあるが、虫の声、秋の空"
        else:
            return "秋（長月・9月下旬）。秋分を過ぎ、彼岸花、秋の夜長"
    elif month == 10:
        return "秋（神無月・10月）。紅葉、秋晴れ、金木犀の香り"
    elif month == 11:
        if day < 8:
            return "晩秋（霜月・11月初旬）。紅葉が深まり、朝晩の冷え込み"
        else:
            return "晩秋〜初冬（霜月・11月）。立冬を迎え、木枯らし、枯葉の季節"
    else:  # month == 12
        if day < 22:
            return "冬（師走・12月）。年の瀬、忘年会、冬至に向かう頃"
        else:
            return "冬（師走・12月下旬）。冬至を過ぎ、クリスマス、年末の賑わい"


class ThemeAIClientError(RuntimeError):
    """Raised when an AI client cannot produce a valid theme."""


def count_syllables(text: str) -> int:
    """Count the number of syllables (音数/モーラ) in Japanese text.

    Converts kanji to hiragana using pykakasi, then counts mora correctly.
    Small kana (ゃゅょ etc.) combine with previous character and don't count separately.

    Args:
        text: Japanese text to count syllables in (can include kanji)

    Returns:
        Number of mora (morae count)
    """
    # Remove whitespace and common punctuation
    text = re.sub(r'[\s\u3000。、！？]', '', text)

    # Convert kanji to hiragana using pykakasi
    kks = kakasi()
    result = kks.convert(text)
    hiragana_text = ''.join([item['hira'] for item in result])

    # Small kana that combine with previous character (don't count as separate mora)
    small_kana = 'ゃゅょぁぃぅぇぉゎャュョァィゥェォヮ'

    # Count mora: all kana except small kana count as 1 mora each
    # っ (small tsu) and ー (long vowel) DO count as separate mora
    mora_count = 0
    for char in hiragana_text:
        if '\u3040' <= char <= '\u309F' or '\u30A0' <= char <= '\u30FF':
            # Skip small ya/yu/yo and small vowels (they combine with previous)
            if char not in small_kana:
                mora_count += 1

    return mora_count


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

    def generate(
        self,
        *,
        category: str,
        target_date: date,
        past_themes: list[str] | None = None,
    ) -> str:
        """Return a generated theme for the given category and date.

        Args:
            category: カテゴリー名
            target_date: 対象日付
            past_themes: 過去のお題リスト（重複防止用、プロンプトに含める）
        """


@dataclass(slots=True)
class DummyThemeAIClient(ThemeAIClient):
    """Fallback AI client returning deterministic strings."""

    prefix: str = "Placeholder theme"

    def generate(
        self,
        *,
        category: str,
        target_date: date,
        past_themes: list[str] | None = None,
    ) -> str:
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
        "恋愛": (
            "恋愛・片思い・デート・別れなど、恋にまつわるシーンを表現してください。"
            "「甘酸っぱい青春」「大人の苦い恋」「運命の出会い」など、"
            "読んだ人が自分の思い出を重ねたくなるような、エモーショナルな句にしてください。"
        ),
        "季節": (
            "季節感、天気、自然の移り変わりを表現してください。"
            "単なる風景描写だけでなく、「その季節ならではの匂い・温度・感情」を"
            "呼び起こすような、五感に訴える表現を目指してください。\n"
            "【重要】現在の季節: {season_info}"
        ),
        "日常": (
            "通勤・通学、食事、仕事、家事などの日常シーンを切り取ってください。"
            "「あるある」と共感できる瞬間や、普段見落としがちな小さな幸せ・発見を"
            "ユニークな視点で表現してください。"
        ),
        "ユーモア": (
            "ユーザーが思わず「下の句」でツッコミを入れたくなるような『大喜利のフリ』となる句を作ってください。"
            "以下の4つのパターンのいずれかを意識してください:\n"
            "1. 【自虐・失敗】自分のダメな部分や、日常の悲しい失敗談。\n"
            "2. 【シュール】現実ではありえない状況設定。\n"
            "3. 【社会風刺】会社や学校、世の中への皮肉。\n"
            "4. 【VS型】「きのこたけのこ」のような究極の選択や論争の火種。\n"
            "クスッと笑える、あるいは「なんでやねん」と言いたくなるボケをかましてください。"
        ),
    }

    def generate(
        self,
        *,
        category: str,
        target_date: date,
        past_themes: list[str] | None = None,
    ) -> str:
        """Generate a haiku theme with 5-7-5 syllable validation.

        Retries up to MAX_RETRIES times if the generated haiku does not match 5-7-5.
        """
        MAX_RETRIES = 3

        # カテゴリーに応じたプロンプトを取得
        category_instruction = self.CATEGORY_PROMPTS.get(
            category,
            f"「{category}」というテーマで現代的な表現を使ってください。"
        )
        # 季節情報をプロンプトに挿入
        season_info = get_season_info(target_date)
        category_instruction = category_instruction.format(season_info=season_info)

        # 過去のお題を避けるための指示を構築
        past_themes_instruction = ""
        if past_themes:
            # 最新20件を表示（プロンプトが長くなりすぎないように）
            recent_themes = past_themes[:20]
            past_list = "\n".join(f"- {t.replace(chr(10), ' / ')}" for t in recent_themes)
            past_themes_instruction = (
                f"\n\n【重要：過去のお題との重複禁止】\n"
                f"以下は過去に出題されたお題です。これらと同じ・類似のお題は絶対に作らないでください。\n"
                f"新しい視点、新しい言葉の組み合わせで、まだ詠まれていないお題を創作してください。\n"
                f"{past_list}"
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
                    "content": "すれ違う（す1れ2ち3が4う5）\nいつもの駅で（い1つ2も3の4え5き6で7）\nまた会えた（ま1た2あ3え4た5）"
                },
                {
                    "role": "user",
                    "content": "季節をテーマに、下の句で完結する5-7-5の上の句を作ってください。音数を数えてから作ってください。"
                },
                {
                    "role": "assistant",
                    "content": "傘なくて（か1さ2な3く4て5）\nにわか雨降る（に1わ2か3あ4め5ふ6る7）\n君と僕（き1み2と3ぼ4く5）"
                },
                {
                    "role": "user",
                    "content": "日常をテーマに、下の句で完結する5-7-5の上の句を作ってください。音数を数えてから作ってください。"
                },
                {
                    "role": "assistant",
                    "content": "寝過ごして（ね1す2ご3し4て5）\n電車の中で（で1ん2しゃ3の4な5か6で7）\n目が覚める（め1が2さ3め4る5）"
                },
                {
                    "role": "user",
                    "content": (
                        f"以下の条件で、ユーザーが下の句を続けたくなる「上の句」を作成してください。\n"
                        f"**作成前に必ず一音ずつ数えて、5-7-5を厳密に確認してください。**\n\n"
                        f"【音数の厳守（絶対条件）】\n"
                        f"- 1行目：必ず正確に5音（例: す・れ・ち・が・う）\n"
                        f"- 2行目：必ず正確に7音（例: い・つ・も・の・え・き・で）\n"
                        f"- 3行目：必ず正確に5音（例: ま・た・あ・え・た）\n"
                        f"- 音数が合わない句は絶対に出力しないでください\n\n"
                        f"【独創性（重要）】\n"
                        f"- ありきたりな表現は避ける\n"
                        f"- 意外性のある視点や切り口を見つける\n"
                        f"- 見慣れた風景に新しい発見をもたらす\n"
                        f"- 読んだ人が「なるほど！」と思える表現\n\n"
                        f"【示唆に富んだ表現（重要）】\n"
                        f"- 単なる事実の羅列ではなく、深い意味を含める\n"
                        f"- 読む人の想像力を刺激する言葉選び\n"
                        f"- 多義的な解釈ができる余韻を持たせる\n"
                        f"- 印象に残る、心に響く表現を目指す\n\n"
                        f"【下の句で完結させる】\n"
                        f"- 上の句では完結させず、余韻を残す\n"
                        f"- 情景描写に留め、感情や結論は下の句に委ねる\n"
                        f"- 「〜てる」「〜いる」「〜した」など、続きを想像させる表現\n"
                        f"- ユーザーが「続きを詠みたい！」と思える内容\n\n"
                        f"【表現スタイル】\n"
                        f"- 現代的でポップな言葉を使用\n"
                        f"- ひらがな・カタカナ・漢字を自然にミックス\n"
                        f"- 情景が目に浮かぶ具体的な表現\n"
                        f"- テーマ: {category_instruction}"
                        f"{past_themes_instruction}\n\n"
                        f"【出力形式】\n"
                        f"- 必ず3行（1行目5音/2行目7音/3行目5音）\n"
                        f"- 句のみ出力（音数カウントや説明は不要）\n"
                        f"- 例: すれ違う\\nいつもの駅で\\nまた会えた"
                    ),
                },
            ],
            "temperature": 1.0,
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
    model: str = "grok-4-1-fast-reasoning"
    endpoint: str = "https://api.x.ai/v1/chat/completions"
    timeout: float = 30.0

    # カテゴリー別のプロンプト定義（OpenAIと統一）
    CATEGORY_PROMPTS = {
        "恋愛": (
            "恋愛・片思い・デート・別れなど、恋にまつわるシーンを表現してください。"
            "「甘酸っぱい青春」「大人の苦い恋」「運命の出会い」など、"
            "読んだ人が自分の思い出を重ねたくなるような、エモーショナルな句にしてください。"
        ),
        "季節": (
            "季節感、天気、自然の移り変わりを表現してください。"
            "単なる風景描写だけでなく、「その季節ならではの匂い・温度・感情」を"
            "呼び起こすような、五感に訴える表現を目指してください。\n"
            "【重要】現在の季節: {season_info}"
        ),
        "日常": (
            "通勤・通学、食事、仕事、家事などの日常シーンを切り取ってください。"
            "「あるある」と共感できる瞬間や、普段見落としがちな小さな幸せ・発見を"
            "ユニークな視点で表現してください。"
        ),
        "ユーモア": (
            "ユーザーが思わず「下の句」でツッコミを入れたくなるような『大喜利のフリ』となる句を作ってください。"
            "以下の4つのパターンのいずれかを意識してください:\n"
            "1. 【自虐・失敗】自分のダメな部分や、日常の悲しい失敗談。\n"
            "2. 【シュール】現実ではありえない状況設定。\n"
            "3. 【社会風刺】会社や学校、世の中への皮肉。\n"
            "4. 【VS型】「きのこたけのこ」のような究極の選択や論争の火種。\n"
            "クスッと笑える、あるいは「なんでやねん」と言いたくなるボケをかましてください。"
        ),
    }

    def generate(
        self,
        *,
        category: str,
        target_date: date,
        past_themes: list[str] | None = None,
    ) -> str:
        """Generate a haiku theme with 5-7-5 syllable validation.

        Retries up to MAX_RETRIES times if the generated haiku does not match 5-7-5.
        """
        MAX_RETRIES = 3

        # カテゴリーに応じたプロンプトを取得
        category_instruction = self.CATEGORY_PROMPTS.get(
            category,
            f"「{category}」というテーマで現代的な表現を使ってください。"
        )
        # 季節情報をプロンプトに挿入
        season_info = get_season_info(target_date)
        category_instruction = category_instruction.format(season_info=season_info)

        # 過去のお題を避けるための指示を構築
        past_themes_instruction = ""
        if past_themes:
            # 最新20件を表示（プロンプトが長くなりすぎないように）
            recent_themes = past_themes[:20]
            past_list = "\n".join(f"- {t.replace(chr(10), ' / ')}" for t in recent_themes)
            past_themes_instruction = (
                f"\n\n【重要：過去のお題との重複禁止】\n"
                f"以下は過去に出題されたお題です。これらと同じ・類似のお題は絶対に作らないでください。\n"
                f"新しい視点、新しい言葉の組み合わせで、まだ詠まれていないお題を創作してください。\n"
                f"{past_list}"
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
                    "content": "すれ違う（す1れ2ち3が4う5）\nいつもの駅で（い1つ2も3の4え5き6で7）\nまた会えた（ま1た2あ3え4た5）"
                },
                {
                    "role": "user",
                    "content": "季節をテーマに、下の句で完結する5-7-5の上の句を作ってください。音数を数えてから作ってください。"
                },
                {
                    "role": "assistant",
                    "content": "傘なくて（か1さ2な3く4て5）\nにわか雨降る（に1わ2か3あ4め5ふ6る7）\n君と僕（き1み2と3ぼ4く5）"
                },
                {
                    "role": "user",
                    "content": (
                        f"以下の条件で、ユーザーが下の句を続けたくなる「上の句」を作成してください。\n"
                        f"**作成前に必ず一音ずつ数えて、5-7-5を厳密に確認してください。**\n\n"
                        f"【音数の厳守（絶対条件）】\n"
                        f"- 1行目：必ず正確に5音（例: す・れ・ち・が・う）\n"
                        f"- 2行目：必ず正確に7音（例: い・つ・も・の・え・き・で）\n"
                        f"- 3行目：必ず正確に5音（例: ま・た・あ・え・た）\n"
                        f"- 音数が合わない句は絶対に出力しないでください\n\n"
                        f"【独創性（重要）】\n"
                        f"- ありきたりな表現は避ける\n"
                        f"- 意外性のある視点や切り口を見つける\n"
                        f"- 見慣れた風景に新しい発見をもたらす\n"
                        f"- 読んだ人が「なるほど！」と思える表現\n\n"
                        f"【示唆に富んだ表現（重要）】\n"
                        f"- 単なる事実の羅列ではなく、深い意味を含める\n"
                        f"- 読む人の想像力を刺激する言葉選び\n"
                        f"- 多義的な解釈ができる余韻を持たせる\n"
                        f"- 印象に残る、心に響く表現を目指す\n\n"
                        f"【下の句で完結させる】\n"
                        f"- 上の句では完結させず、余韻を残す\n"
                        f"- 情景描写に留め、感情や結論は下の句に委ねる\n"
                        f"- 「〜てる」「〜いる」「〜した」など、続きを想像させる表現\n"
                        f"- ユーザーが「続きを詠みたい！」と思える内容\n\n"
                        f"【表現スタイル】\n"
                        f"- 現代的でポップな言葉を使用\n"
                        f"- ひらがな・カタカナ・漢字を自然にミックス\n"
                        f"- 情景が目に浮かぶ具体的な表現\n"
                        f"- テーマ: {category_instruction}"
                        f"{past_themes_instruction}\n\n"
                        f"【出力形式】\n"
                        f"- 必ず3行（1行目5音/2行目7音/3行目5音）\n"
                        f"- 句のみ出力（音数カウントや説明は不要）\n"
                        f"- 例: すれ違う\\nいつもの駅で\\nまた会えた"
                    ),
                },
            ],
            "temperature": 1.0,
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

    # カテゴリー別のプロンプト定義（OpenAI/XAIと統一）
    CATEGORY_PROMPTS = {
        "恋愛": (
            "恋愛・片思い・デート・別れなど、恋にまつわるシーンを表現してください。"
            "「甘酸っぱい青春」「大人の苦い恋」「運命の出会い」など、"
            "読んだ人が自分の思い出を重ねたくなるような、エモーショナルな句にしてください。"
        ),
        "季節": (
            "季節感、天気、自然の移り変わりを表現してください。"
            "単なる風景描写だけでなく、「その季節ならではの匂い・温度・感情」を"
            "呼び起こすような、五感に訴える表現を目指してください。\n"
            "【重要】現在の季節: {season_info}"
        ),
        "日常": (
            "通勤・通学、食事、仕事、家事などの日常シーンを切り取ってください。"
            "「あるある」と共感できる瞬間や、普段見落としがちな小さな幸せ・発見を"
            "ユニークな視点で表現してください。"
        ),
        "ユーモア": (
            "ユーザーが思わず「下の句」でツッコミを入れたくなるような『大喜利のフリ』となる句を作ってください。"
            "以下の4つのパターンのいずれかを意識してください:\n"
            "1. 【自虐・失敗】自分のダメな部分や、日常の悲しい失敗談。\n"
            "2. 【シュール】現実ではありえない状況設定。\n"
            "3. 【社会風刺】会社や学校、世の中への皮肉。\n"
            "4. 【VS型】「きのこたけのこ」のような究極の選択や論争の火種。\n"
            "クスッと笑える、あるいは「なんでやねん」と言いたくなるボケをかましてください。"
        ),
    }

    def generate(
        self,
        *,
        category: str,
        target_date: date,
        past_themes: list[str] | None = None,
    ) -> str:
        """Generate a haiku theme with 5-7-5 syllable validation.

        Retries up to MAX_RETRIES times if the generated haiku does not match 5-7-5.
        """
        MAX_RETRIES = 3

        # カテゴリーに応じたプロンプトを取得
        category_instruction = self.CATEGORY_PROMPTS.get(
            category,
            f"「{category}」というテーマで現代的な表現を使ってください。"
        )
        # 季節情報をプロンプトに挿入
        season_info = get_season_info(target_date)
        category_instruction = category_instruction.format(season_info=season_info)

        # 過去のお題を避けるための指示を構築
        past_themes_instruction = ""
        if past_themes:
            # 最新20件を表示（プロンプトが長くなりすぎないように）
            recent_themes = past_themes[:20]
            past_list = "\n".join(f"- {t.replace(chr(10), ' / ')}" for t in recent_themes)
            past_themes_instruction = (
                f"\n\n【重要：過去のお題との重複禁止】\n"
                f"以下は過去に出題されたお題です。これらと同じ・類似のお題は絶対に作らないでください。\n"
                f"新しい視点、新しい言葉の組み合わせで、まだ詠まれていないお題を創作してください。\n"
                f"{past_list}"
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

        # ユーザープロンプト（改善版：ひらがな出力・独創性重視）
        user_prompt = (
            f"以下の条件で、ユーザーが下の句を続けたくなる「上の句」を作成してください。\n"
            f"**作成前に必ず一音ずつ数えて、5-7-5を厳密に確認してください。**\n\n"
            f"【音数の厳守（絶対条件）】\n"
            f"- 1行目：必ず正確に5音（例: す・れ・ち・が・う）\n"
            f"- 2行目：必ず正確に7音（例: い・つ・も・の・え・き・で）\n"
            f"- 3行目：必ず正確に5音（例: ま・た・あ・え・た）\n"
            f"- 音数が合わない句は絶対に出力しないでください\n\n"
            f"【重要：すべてひらがなで出力】\n"
            f"- 漢字・カタカナは一切使わず、すべてひらがなで表現\n"
            f"- 例: 「カフェ」→「かふぇ」、「駅」→「えき」\n\n"
            f"【独創性（重要）】\n"
            f"- ありきたりな表現は避ける\n"
            f"- 意外性のある視点や切り口を見つける\n"
            f"- 見慣れた風景に新しい発見をもたらす\n"
            f"- 読んだ人が「なるほど！」と思える表現\n\n"
            f"【下の句で完結させる】\n"
            f"- 上の句では完結させず、余韻を残す\n"
            f"- 情景描写に留め、感情や結論は下の句に委ねる\n"
            f"- 「〜てる」「〜いる」「〜した」など、続きを想像させる表現\n"
            f"- ユーザーが「続きを詠みたい！」と思える内容\n\n"
            f"【テーマ】\n"
            f"{category_instruction}"
            f"{past_themes_instruction}\n\n"
            f"【出力形式】\n"
            f"- 必ず3行（1行目5音/2行目7音/3行目5音）\n"
            f"- すべてひらがなのみ\n"
            f"- 句のみ出力（音数カウントや説明は不要）\n"
            f"- 例: すれちがう\\nいつものえきで\\nまたあえた"
        )

        client = anthropic.Anthropic(api_key=self.api_key, timeout=self.timeout)

        # Few-shot examples（OpenAI/XAIと統一）
        few_shot_messages = [
            {"role": "user", "content": "恋愛をテーマに、下の句で完結する5-7-5の上の句を作ってください。音数を数えてから作ってください。"},
            {"role": "assistant", "content": "すれ違う（す1れ2ち3が4う5）\nいつもの駅で（い1つ2も3の4え5き6で7）\nまた会えた（ま1た2あ3え4た5）"},
            {"role": "user", "content": "季節をテーマに、下の句で完結する5-7-5の上の句を作ってください。音数を数えてから作ってください。"},
            {"role": "assistant", "content": "傘なくて（か1さ2な3く4て5）\nにわか雨降る（に1わ2か3あ4め5ふ6る7）\n君と僕（き1み2と3ぼ4く5）"},
            {"role": "user", "content": "日常をテーマに、下の句で完結する5-7-5の上の句を作ってください。音数を数えてから作ってください。"},
            {"role": "assistant", "content": "寝過ごして（ね1す2ご3し4て5）\n電車の中で（で1ん2しゃ3の4な5か6で7）\n目が覚める（め1が2さ3め4る5）"},
        ]

        last_content = None
        last_counts = None

        for attempt in range(1, MAX_RETRIES + 1):
            try:
                message = client.messages.create(
                    model=self.model,
                    max_tokens=200,
                    temperature=1.0,
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
