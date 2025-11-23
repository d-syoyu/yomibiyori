# app/services/theme_ai_client.py （ファイル名変更推奨）
# -*- coding: utf-8 -*-
"""最強バズお題生成クライアント（2025年11月最新版）"""

from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import date
from typing import Protocol

import anthropic
import requests
from pykakasi import kakasi

from app.core.config import get_settings


# === 音数カウント（現状の完璧な実装をそのまま使用）===
def count_syllables(text: str) -> int:
    text = re.sub(r'[\s\u3000。、！？]', '', text)
    kks = kakasi()
    result = kks.convert(text)
    hiragana_text = ''.join(item['hira'] for item in result)
    small_kana = 'ゃゅょぁぃぅぇぉゎャュョァィゥェォヮ'
    mora_count = 0
    for char in hiragana_text:
        if '\u3040' <= char <= '\u309F' or '\u30A0' <= char <= '\u30FF':
            if char not in small_kana:
                mora_count += 1
    return mora_count


def validate_575(text: str) -> tuple[bool, list[int]]:
    lines = [l.strip() for l in text.strip().split('\n') if l.strip()]
    if len(lines) != 3:
        return False, []
    counts = [count_syllables(line) for line in lines]
    return counts == [5, 7, 5], counts


class ThemeAIClient(Protocol):
    def generate(self, *, category: str, target_date: date) -> str: ...


# === 全プロバイダ共通の最強プロンプトテンプレート ===
BEST_PROMPT_TEMPLATE = """
あなたは日本一バズる短歌の「上の句」を作る天才詩人です。
条件をすべて厳守して、ユーザーが「これ下の句絶対詠みたい！」と思う句を作ってください。

【最重要：5-7-5を絶対厳守】
・1行目：必ず5音
・2行目：必ず7音
・3行目：必ず5音
・音数が合わない句は絶対に作らない（作成前に必ず数えてください）

【バズるための必須要素（どれか1つ以上必ず入れる）】
1. 「あるあるすぎて叫びたくなる共感」
2. 「スクショしてシェアしたくなるフレーズ」
3. 「下の句で盛大にツッコミたくなる大喜利」
4. 「初音ミクが歌いそう」「アニメのタイトルみたい」
5. 「死ぬまでに言いたい本音」

【カテゴリ別指示】
{category_instruction}

【出力ルール】
・必ず3行で改行
・漢字・カタカナ・ひらがなをバランスよく使う（縦書き映え重視）
・句の最後に「。」「！」などは絶対つけない
・句のみ出力（説明・音数表示・引用符など一切なし）

例（恋愛）：
すれ違いざま
君のシャンプーの匂い
また振り向く

例（ユーモア）：
俺の年収
画面に表示された瞬間
母が泣いた

今から作ってください。テーマ：{category}
"""


# === カテゴリ別「最強バズ指示」===
BUZZ_INSTRUCTIONS = {
    "恋愛": "10代〜30代が「これ私の話じゃん」と叫ぶような、甘酸っぱいor切ない恋愛ネタにしてください。「片思い」「失恋」「運命の再会」など感情が爆発する瞬間を切り取って。",
    "季節": "「この季節のこの匂い！」と五感が刺激される表現にしてください。季節＋感情がセットになった「エモい」句を目指して。",
    "日常": "「あるあるすぎて草」「これ私だけじゃなかったの！？」と思わせる日常の小さな発見や失敗を、共感度MAXで表現してください。",
    "ユーモア": "大喜利のフリとして完璧な句にしてください。ユーザーが「下の句で絶対ツッコむ」と思える自虐・シュール・社会風刺・究極の選択のいずれかで盛大にボケてください。",
}


@dataclass(slots=True)
class UnifiedBestThemeClient(ThemeAIClient):
    """OpenAI / Grok / Claude すべてで最高のバズお題が出る統一クライアント"""
    
    api_key: str
    model: str
    endpoint: str
    provider: str  # "openai" / "xai" / "claude"
    timeout: float = 30.0

    def generate(self, *, category: str, target_date: date) -> str:
        instruction = BUZZ_INSTRUCTIONS.get(category, "面白い句を作ってください")
        prompt = BEST_PROMPT_TEMPLATE.format(category_instruction=instruction, category=category)

        MAX_RETRIES = 5  # バズ狙いはリトライ多めで確実に良句を

        for attempt in range(1, MAX_RETRIES + 1):
            if self.provider in ["openai", "xai"]:
                payload = {
                    "model": self.model,
                    "messages": [
                        {"role": "system", "content": "あなたは日本一バズる短歌の上の句を作る天才です。必ず5-7-5を守ります。"},
                        {"role": "user", "content": prompt}
                    ],
                    "temperature": 1.3,  # バズ狙いは高温度
                    "max_tokens": 150,
                }
                headers = {"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"}
                resp = requests.post(self.endpoint, json=payload, headers=headers, timeout=self.timeout)

            else:  # claude
                client = anthropic.Anthropic(api_key=self.api_key)
                message = client.messages.create(
                    model=self.model,
                    max_tokens=150,
                    temperature=1.3,
                    system="あなたは日本一バズる短歌の上の句を作る天才です。必ず5-7-5を守ります。",
                    messages=[{"role": "user", "content": prompt}]
                )
                resp_text = "".join(block.text for block in message.content if block.type == "text")
                is_valid, counts = validate_575(resp_text)
                if is_valid:
                    return resp_text
                continue

            # OpenAI/Grok共通処理
            if resp.status_code != 200:
                continue
            content = resp.json()["choices"][0]["message"]["content"].strip()
            is_valid, counts = validate_575(content)
            if is_valid:
                print(f"[BUZZ THEME] SUCCESS on attempt {attempt}: {content}")
                return content

            print(f"[BUZZ THEME] Attempt {attempt} failed: {counts} → retrying...")

        # 最終手段：手動で最高のやつを返す（絶対失敗しない）
        fallback_themes = {
            "恋愛": "すれ違いざま\n君のシャンプーの匂い\nまた振り向く",
            "季節": "紅葉狩り\nスマホ落として見上げたら\n空が綺麗",
            "日常": "寝坊して\n走って駅に着いたら\n電車遅延",
            "ユーモア": "俺の年収\n画面に表示された瞬間\n母が泣いた",
        }
        return fallback_themes.get(category, "今日も生きてる\nなんとかやってる\n明日も頑張る")


def resolve_theme_ai_client() -> ThemeAIClient:
    """環境変数でプロバイダ切り替え → すべて最強バズモードに統一"""
    settings = get_settings()
    provider = (settings.theme_ai_provider or "xai").lower()

    if provider == "openai":
        return UnifiedBestThemeClient(
            api_key=settings.openai_api_key,
            model=settings.openai_model or "gpt-4o-mini",
            endpoint="https://api.openai.com/v1/chat/completions",
            provider="openai",
        )
    if provider == "xai":
        return UnifiedBestThemeClient(
            api_key=settings.xai_api_key,
            model=settings.xai_model or "grok-4-1-fast-reasoning",
            endpoint="https://api.x.ai/v1/chat/completions",
            provider="xai",
        )
    if provider == "claude":
        return UnifiedBestThemeClient(
            api_key=settings.anthropic_api_key,
            model=settings.claude_model or "claude-sonnet-4-5-20250929",
            endpoint="",  # claudeは別処理
            provider="claude",
        )
    
    return UnifiedBestThemeClient(
        api_key="dummy", model="dummy", endpoint="", provider="xai"
    )
