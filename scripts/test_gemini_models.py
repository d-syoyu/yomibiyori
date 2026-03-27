"""Test script: Gemini 3.1 Flash Lite for both generation and judging."""

from __future__ import annotations

import json
import time
from datetime import date

import requests

from app.services.theme_ai_client import (
    GeminiThemeJudge,
    ThemeAIClientError,
    ThemeCandidate,
    _filter_xai_candidates,
    _split_xai_candidates,
    get_season_info,
    validate_575,
)
from app.core.config import get_settings


MODEL = "gemini-3.1-flash-lite-preview"
CATEGORIES = ["恋愛", "季節", "日常", "ユーモア"]
TARGET_DATE = date(2026, 3, 28)

# XAIThemeClient と同じプロンプト
CATEGORY_PROMPTS = {
    "恋愛": (
        "恋愛・片思い・デート・別れなど、恋にまつわるシーンを「つぶやき」として表現してください。"
        "「LINEで送るような言葉」や「心の中の独り言」のように、"
        "飾らない言葉で、誰もが「あるある」と共感できるシーンにしてください。"
    ),
    "季節": (
        "季節感、天気、自然の移り変わりを「具体的な映像」として表現してください。"
        "難しい言葉は使わず、その季節ならではの「光景」や「音」を切り取ってください。\n"
        "【重要】現在の季節: {season_info}"
    ),
    "日常": (
        "通勤・通学、食事、仕事、家事などの日常シーンを切り取ってください。"
        "「あーあ」とため息をつく瞬間や、ふとした瞬間の「独り言」を"
        "そのまま5-7-5にしてください。"
    ),
    "ユーモア": (
        "ユーザーが思わず「下の句」でツッコミを入れたくなるような『大喜利のフリ』となる句を作ってください。"
        "以下の5つのパターンのいずれかを意識してください:\n"
        "1. 【自虐・失敗】自分のダメな部分や、日常の悲しい失敗談。\n"
        "2. 【シュール】現実ではありえない状況設定。\n"
        "3. 【社会風刺】会社や学校、世の中への皮肉。\n"
        "4. 【VS型】「きのこたけのこ」のような究極の選択や論争の火種。\n"
        "5. 【ブラックユーモア】人生の不条理、存在の虚しさ、世代間ギャップ、"
        "老い、孤独、締切、税金など「笑うしかない現実」を皮肉たっぷりに詠む。"
        "毒があるが品がある、読んだ人が「わかる…」と苦笑いするような句を目指してください。\n"
        "クスッと笑える、あるいは「なんでやねん」と言いたくなるボケをかましてください。"
    ),
}


def generate_candidates(api_key: str, category: str) -> str:
    """Gemini に3候補を生成させる（生テキストを返す）。"""
    season_info = get_season_info(TARGET_DATE)
    category_instruction = CATEGORY_PROMPTS.get(
        category,
        f"「{category}」というテーマで現代的な表現を使ってください。",
    ).format(season_info=season_info)

    payload = {
        "model": MODEL,
        "messages": [
            {
                "role": "system",
                "content": (
                    "あなたは音数（モーラ数）に精通した現代の詩人ですが、決して気取らず、"
                    "友達とのLINEやSNSのつぶやきのような「話し言葉」で5-7-5の上の句を作ります。\n"
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
                "content": "恋愛をテーマに、下の句で完結する5-7-5の上の句を作ってください。音数を数えてから作ってください。",
            },
            {"role": "assistant", "content": "好きな人\nストーリーだけ\n見ちゃってさ"},
            {
                "role": "user",
                "content": "季節をテーマに、下の句で完結する5-7-5の上の句を作ってください。音数を数えてから作ってください。",
            },
            {"role": "assistant", "content": "コンビニの\nおでん買っちゃう\n帰り道"},
            {
                "role": "user",
                "content": (
                    f"以下の条件で、ユーザーが下の句を続けたくなる「上の句」を作成してください。\n"
                    f"**作成前に必ず一音ずつ数えて、5-7-5を厳密に確認してください。**\n"
                    f"**3候補を作り、候補と候補の間は必ず `---` だけを1行で入れてください。説明文や番号は不要です。**\n\n"
                    f"【音数の厳守（絶対条件）】\n"
                    f"- 1行目：必ず正確に5音\n- 2行目：必ず正確に7音\n- 3行目：必ず正確に5音\n"
                    f"- 音数が合わない句は絶対に出力しないでください\n"
                    f"- 3候補とも、少しずつ切り口を変えてください\n\n"
                    f"【1. 「詩」ではなく「つぶやき」】\n"
                    f"- 詩的な表現、芸術的な熟語、古風な言い回しは禁止です。\n"
                    f"- 友達とのLINEや、独り言のような自然な「話し言葉」にしてください。\n\n"
                    f"【2. 「未完の文」で終わらせる（余白を作る）】\n"
                    f"- 上の句（5-7-5）だけで意味を完結させないでください。\n\n"
                    f"【3. 「映像」か「音」を描写（抽象概念の禁止）】\n"
                    f"- 「愛」「未来」「希望」「絶望」などの抽象的な言葉は禁止です。\n\n"
                    f"【テーマ】\n{category_instruction}\n\n"
                    f"【出力形式】\n"
                    f"- 3候補を出力する\n"
                    f"- 各候補は必ず3行（1行目5音/2行目7音/3行目5音）\n"
                    f"- 候補の間は `---` の1行だけで区切る\n"
                    f"- 句のみ出力（音数カウント、候補番号、説明、理由は不要）"
                ),
            },
        ],
        "temperature": 1.0,
        "max_tokens": 320,
    }

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    resp = requests.post(
        "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
        json=payload,
        headers=headers,
        timeout=60.0,
    )
    resp.raise_for_status()
    return resp.json()["choices"][0]["message"]["content"].strip()


def main() -> None:
    settings = get_settings()
    api_key = settings.gemini_api_key
    if not api_key:
        print("[ERROR] GEMINI_API_KEY is not configured")
        raise SystemExit(1)

    print(f"Model (生成+判定): {MODEL}")
    print(f"Target date: {TARGET_DATE}")
    print(f"Categories: {', '.join(CATEGORIES)}")
    print()

    judge = GeminiThemeJudge(api_key=api_key, model=MODEL, timeout=30.0)

    for category in CATEGORIES:
        print(f"{'='*60}")
        print(f"  カテゴリー: {category}")
        print(f"{'='*60}")

        # --- Step 1: 候補生成 ---
        gen_start = time.time()
        try:
            raw_content = generate_candidates(api_key, category)
        except Exception as exc:
            print(f"  [生成ERROR] {exc}\n")
            continue
        gen_time = time.time() - gen_start

        raw_candidates = _split_xai_candidates(raw_content)
        filtered = _filter_xai_candidates(raw_candidates)

        print(f"\n  生成候補 ({gen_time:.1f}s):")
        for i, c in enumerate(raw_candidates):
            is_valid, counts = validate_575(c.text)
            status = "5-7-5 OK" if is_valid else f"NG {counts}"
            mark = " " if c in filtered else "x"
            lines = c.text.replace("\n", " / ")
            print(f"    [{mark}] 候補{i}: {lines}  ({status})")

        if not filtered:
            print("  → 有効な候補なし（全てフィルタ落ち）\n")
            continue

        # --- Step 2: Gemini Judge ---
        judge_start = time.time()
        try:
            result = judge.choose_candidate(
                category=category,
                target_date=TARGET_DATE,
                candidates=filtered,
            )
        except ThemeAIClientError as exc:
            judge_time = time.time() - judge_start
            print(f"  [判定ERROR] ({judge_time:.1f}s) {exc}\n")
            # fallback
            for c in filtered:
                v, cts = validate_575(c.text)
                if v:
                    print(f"  → フォールバック選択:")
                    for line in c.text.split("\n"):
                        print(f"      {line}")
                    break
            print()
            continue
        judge_time = time.time() - judge_start

        selected = next(c for c in filtered if c.index == result.selected_index)
        is_valid, counts = validate_575(selected.text)

        print(f"\n  Gemini Judge 判定 ({judge_time:.1f}s):")
        print(f"    選択: 候補{result.selected_index}")
        print(f"    理由: {result.reason}")
        if result.scores:
            for s in result.scores:
                print(
                    f"    スコア(候補{s.get('index','-')}): "
                    f"参加={s.get('participation','-')} "
                    f"自然={s.get('naturalness','-')} "
                    f"情景={s.get('imagery','-')} "
                    f"余白={s.get('openness','-')} "
                    f"具体={s.get('concreteness','-')} "
                    f"音数={s.get('mora_validity','-')} "
                    f"新鮮={s.get('freshness','-')}"
                )

        status = "OK" if is_valid else f"NG {counts}"
        print(f"\n  ★ 最終結果 [{status}]:")
        for line in selected.text.split("\n"):
            print(f"      {line}")
        print()

    print(f"{'='*60}")
    print("  完了!")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()
