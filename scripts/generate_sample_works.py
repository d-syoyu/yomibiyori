#!/usr/bin/env python3
"""AI生成によるサンプル作品を投稿するスクリプト

5つのリアルなアカウントで、各カテゴリーのお題に対してAIが下の句を生成し投稿します。
ユーザーが投稿しやすい雰囲気を作るための初期データ生成に使用します。
"""

from __future__ import annotations

import argparse
import os
import random
import time
from datetime import datetime, date

import requests
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.session import SessionLocal
from app.services.work_ai_client import resolve_work_ai_client, WorkAIClientError
from app.services.themes import get_today_theme

# 50個のリアルなサンプルアカウント
SAMPLE_ACCOUNTS = [
    # 繊細・情景派 (10人)
    {"email": "yuki.tanaka@yomibiyori.app", "password": "Sample123!Secure", "username": "月夜のゆき", "persona": "静かで繊細な情景描写を心がけ、夜や月の美しさを感じさせる表現を使います。"},
    {"email": "shiori.suzuki@yomibiyori.app", "password": "Sample123!Secure", "username": "雨音しおり", "persona": "雨の音や水の流れなど、繊細な自然の音に心を寄せる詩人です。"},
    {"email": "yua.nakamura@yomibiyori.app", "password": "Sample123!Secure", "username": "夕暮れのゆあ", "persona": "夕暮れ時の切なさや儚さを繊細に描く表現を好みます。"},
    {"email": "mizuki.watanabe@yomibiyori.app", "password": "Sample123!Secure", "username": "水面みずき", "persona": "水の流れや波紋など、静かで流動的な美しさを詠みます。"},
    {"email": "sora.kato@yomibiyori.app", "password": "Sample123!Secure", "username": "空色のそら", "persona": "空の色や雲の動き、天候の移り変わりに心を寄せます。"},
    {"email": "tsubaki.yamamoto@yomibiyori.app", "password": "Sample123!Secure", "username": "椿のつぼみ", "persona": "花のつぼみや開花の瞬間など、生命の息吹を感じる表現が得意です。"},
    {"email": "kaede.ishikawa@yomibiyori.app", "password": "Sample123!Secure", "username": "楓の葉音", "persona": "葉の音や木々のささやきなど、自然の静かな声に耳を傾けます。"},
    {"email": "hinata.yoshida@yomibiyori.app", "password": "Sample123!Secure", "username": "陽だまりひなた", "persona": "穏やかな陽だまりの温もりや優しさを表現します。"},
    {"email": "luna.hayashi@yomibiyori.app", "password": "Sample123!Secure", "username": "星月ルナ", "persona": "星空や月夜の幻想的な美しさを詠む詩人です。"},
    {"email": "yuki.sasaki@yomibiyori.app", "password": "Sample123!Secure", "username": "雪解けゆき", "persona": "雪の静けさと解ける瞬間の儚さを繊細に表現します。"},

    # 明るい・ポジティブ派 (10人)
    {"email": "haruto.sato@yomibiyori.app", "password": "Sample123!Secure", "username": "晴れときどき詩", "persona": "明るく前向きで、日常の小さな幸せを見つける視点で、ポジティブな言葉を選びます。"},
    {"email": "aoi.shimizu@yomibiyori.app", "password": "Sample123!Secure", "username": "朝日あおい", "persona": "朝の清々しさと新しい一日への希望を詠みます。"},
    {"email": "natsuki.endo@yomibiyori.app", "password": "Sample123!Secure", "username": "夏空なつき", "persona": "夏の明るさと開放感、元気いっぱいの表現が特徴です。"},
    {"email": "haru.fujita@yomibiyori.app", "password": "Sample123!Secure", "username": "春風はる", "persona": "春の訪れと新しい始まりを喜びとともに表現します。"},
    {"email": "mei.matsumoto@yomibiyori.app", "password": "Sample123!Secure", "username": "笑顔のめい", "persona": "笑顔と幸せを大切にし、前向きで温かい言葉を選びます。"},
    {"email": "hikari.inoue@yomibiyori.app", "password": "Sample123!Secure", "username": "光彩ひかり", "persona": "光の美しさと希望に満ちた明るい表現を好みます。"},
    {"email": "saki.takahashi@yomibiyori.app", "password": "Sample123!Secure", "username": "咲くさき", "persona": "花が咲くように、明るく前向きに日々を詠みます。"},
    {"email": "akari.kimura@yomibiyori.app", "password": "Sample123!Secure", "username": "灯りあかり", "persona": "温かい灯りのように、人の心を照らす表現を心がけます。"},
    {"email": "hana.kobayashi@yomibiyori.app", "password": "Sample123!Secure", "username": "花咲くはな", "persona": "花の開花のような喜びと美しさを表現します。"},
    {"email": "niko.mori@yomibiyori.app", "password": "Sample123!Secure", "username": "にこにこ", "persona": "いつも笑顔で、楽しい日常の瞬間を切り取ります。"},

    # ユーモア・遊び心派 (10人)
    {"email": "aoi.yamada@yomibiyori.app", "password": "Sample123!Secure", "username": "笑う葵", "persona": "ユーモアがあり、くすっと笑える視点や、少し意外性のある表現を好みます。"},
    {"email": "taro.okada@yomibiyori.app", "password": "Sample123!Secure", "username": "脱線太郎", "persona": "予想外の展開や脱線した視点で、面白おかしく詠みます。"},
    {"email": "momo.nakano@yomibiyori.app", "password": "Sample123!Secure", "username": "もちもち桃", "persona": "ゆるくて可愛い、ほっこりするユーモアが特徴です。"},
    {"email": "pochi.tanaka@yomibiyori.app", "password": "Sample123!Secure", "username": "ぽちっと", "persona": "ちょっとした失敗や勘違いを楽しく表現します。"},
    {"email": "kuma.saito@yomibiyori.app", "password": "Sample123!Secure", "username": "くまさん参上", "persona": "のんびりとした視点で、日常のあるあるを面白く詠みます。"},
    {"email": "neko.kondo@yomibiyori.app", "password": "Sample123!Secure", "username": "猫かぶり", "persona": "猫のような気まぐれさと、遊び心ある表現が得意です。"},
    {"email": "piko.ito@yomibiyori.app", "password": "Sample123!Secure", "username": "ぴこぴこ", "persona": "リズミカルで軽快、ポップな言葉遊びを楽しみます。"},
    {"email": "goro.hasegawa@yomibiyori.app", "password": "Sample123!Secure", "username": "ごろごろ", "persona": "のんびりダラダラ、怠惰な日常をユーモラスに描きます。"},
    {"email": "puru.yamaguchi@yomibiyori.app", "password": "Sample123!Secure", "username": "ぷるぷる", "persona": "ふわふわした可愛らしさと、くすっと笑える表現が特徴です。"},
    {"email": "fuwa.sakai@yomibiyori.app", "password": "Sample123!Secure", "username": "ふわふわ雲", "persona": "ふんわりとした優しいユーモアで、心を和ませます。"},

    # 恋愛・感情派 (10人)
    {"email": "sakura.ito@yomibiyori.app", "password": "Sample123!Secure", "username": "花びら舞う", "persona": "恋愛や季節の移り変わりに敏感で、感情豊かで華やかな表現を使います。"},
    {"email": "ai.fujii@yomibiyori.app", "password": "Sample123!Secure", "username": "恋する藍", "persona": "初恋や淡い恋心を繊細に表現する詩人です。"},
    {"email": "miu.nishimura@yomibiyori.app", "password": "Sample123!Secure", "username": "想いのみう", "persona": "片思いや切ない想いを情熱的に詠みます。"},
    {"email": "yui.ogawa@yomibiyori.app", "password": "Sample123!Secure", "username": "結ぶゆい", "persona": "人と人との繋がりや絆を温かく表現します。"},
    {"email": "rin.ikeda@yomibiyori.app", "password": "Sample123!Secure", "username": "凛とした恋", "persona": "凛とした美しさと、凛とした恋心を詠みます。"},
    {"email": "koi.maeda@yomibiyori.app", "password": "Sample123!Secure", "username": "恋ごころ", "persona": "恋する気持ちのドキドキや高鳴りを表現します。"},
    {"email": "hime.okamoto@yomibiyori.app", "password": "Sample123!Secure", "username": "姫桜", "persona": "可憐で華やかな恋愛表現が得意な詩人です。"},
    {"email": "mai.kaneko@yomibiyori.app", "password": "Sample123!Secure", "username": "舞うまい", "persona": "恋のときめきを舞うように華やかに表現します。"},
    {"email": "kohan.ueda@yomibiyori.app", "password": "Sample123!Secure", "username": "湖畔の恋", "persona": "静かな湖のような深い恋心を詠みます。"},
    {"email": "yume.murakami@yomibiyori.app", "password": "Sample123!Secure", "username": "夢見るゆめ", "persona": "恋の夢や理想を優しく儚く表現します。"},

    # 哲学・深遠派 (10人)
    {"email": "ren.kobayashi@yomibiyori.app", "password": "Sample123!Secure", "username": "静寂のれん", "persona": "哲学的で深みがあり、日常に潜む意味や本質を見出す視点を大切にします。"},
    {"email": "zen.morita@yomibiyori.app", "password": "Sample123!Secure", "username": "禅の境地", "persona": "禅的な静けさと悟りの瞬間を表現します。"},
    {"email": "shin.abe@yomibiyori.app", "password": "Sample123!Secure", "username": "深淵のしん", "persona": "深い思索と内省的な視点で物事を見つめます。"},
    {"email": "mu.nomura@yomibiyori.app", "password": "Sample123!Secure", "username": "無の境地", "persona": "無や空虚さの中に美を見出す哲学的な詩人です。"},
    {"email": "gen.takagi@yomibiyori.app", "password": "Sample123!Secure", "username": "幻想げん", "persona": "現実と幻想の狭間を漂う、幻想的な表現を好みます。"},
    {"email": "tou.sakamoto@yomibiyori.app", "password": "Sample123!Secure", "username": "問う人", "persona": "常に問いを投げかけ、本質を探求する姿勢を持ちます。"},
    {"email": "sei.yamashita@yomibiyori.app", "password": "Sample123!Secure", "username": "静謐のせい", "persona": "静かで落ち着いた、深い思索の時間を大切にします。"},
    {"email": "kage.matsuda@yomibiyori.app", "password": "Sample123!Secure", "username": "影法師", "persona": "光と影、表と裏の対比から本質を見出します。"},
    {"email": "yami.nakajima@yomibiyori.app", "password": "Sample123!Secure", "username": "闇と光", "persona": "闇の中に潜む光、対極の美しさを表現します。"},
    {"email": "toki.fujimoto@yomibiyori.app", "password": "Sample123!Secure", "username": "時を紡ぐ", "persona": "時間の流れと人生の意味を深く見つめます。"},
]

# カテゴリーリスト（REQUIREMENTS.mdより）
CATEGORIES = ["恋愛", "季節", "日常", "ユーモア"]

# カテゴリーとアカウントタイプの相性マッピング（派閥ごとに優先順位）
CATEGORY_GROUP_AFFINITY = {
    "恋愛": ["恋愛・感情派", "繊細・情景派", "哲学・深遠派", "明るい・ポジティブ派", "ユーモア・遊び心派"],
    "季節": ["繊細・情景派", "明るい・ポジティブ派", "恋愛・感情派", "哲学・深遠派", "ユーモア・遊び心派"],
    "日常": ["明るい・ポジティブ派", "ユーモア・遊び心派", "哲学・深遠派", "繊細・情景派", "恋愛・感情派"],
    "ユーモア": ["ユーモア・遊び心派", "明るい・ポジティブ派", "恋愛・感情派", "繊細・情景派", "哲学・深遠派"],
}

# アカウントグループの定義（各10人）
ACCOUNT_GROUPS = {
    "繊細・情景派": SAMPLE_ACCOUNTS[0:10],
    "明るい・ポジティブ派": SAMPLE_ACCOUNTS[10:20],
    "ユーモア・遊び心派": SAMPLE_ACCOUNTS[20:30],
    "恋愛・感情派": SAMPLE_ACCOUNTS[30:40],
    "哲学・深遠派": SAMPLE_ACCOUNTS[40:50],
}


def select_daily_accounts(num_accounts: int = 5) -> list[dict]:
    """日替わりでランダムに指定数のアカウントを選択"""
    # シード値を日付ベースで設定することで、同じ日は同じアカウントが選ばれる
    today = datetime.now().date()
    seed = int(today.strftime("%Y%m%d"))
    random.seed(seed)

    # 50個から指定数をランダムに選択
    selected = random.sample(SAMPLE_ACCOUNTS, min(num_accounts, len(SAMPLE_ACCOUNTS)))

    # ログ出力
    print(f"📅 今日の日付: {today}")
    print(f"🎲 ランダムシード: {seed}")
    print(f"👥 選択されたアカウント ({len(selected)}人):")
    for acc in selected:
        print(f"   - {acc['username']}")
    print()

    return selected


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate AI-powered sample works for all categories.")
    parser.add_argument(
        "--api-base",
        default=os.getenv("API_BASE_URL", "https://yomibiyori-production.up.railway.app/api/v1"),
        help="Base URL for the API (default: production)",
    )
    parser.add_argument(
        "--accounts",
        type=int,
        default=5,
        help="Number of accounts to use daily (default: 5, max: 50)",
    )
    parser.add_argument(
        "--per-category",
        type=int,
        default=2,
        help="Number of works per category (default: 2)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Execute without actually posting works.",
    )
    return parser.parse_args()


def create_or_login_user(api_base: str, account: dict) -> str | None:
    """ユーザーを作成またはログインし、アクセストークンを返す"""
    try:
        # サインアップを試行
        response = requests.post(
            f"{api_base}/auth/signup",
            json={
                "email": account["email"],
                "password": account["password"],
                "display_name": account["username"]
            },
            timeout=10.0,
        )

        if response.status_code == 200:
            print(f"✓ ユーザー作成成功: {account['username']}")
            data = response.json()
            if 'session' in data and 'access_token' in data['session']:
                return data['session']['access_token']
            return None

        # ユーザーが既に存在する場合、ログインを試行
        if response.status_code == 400:
            response = requests.post(
                f"{api_base}/auth/login",
                json={
                    "email": account["email"],
                    "password": account["password"]
                },
                timeout=10.0,
            )

            if response.status_code == 200:
                print(f"- ユーザー既存: {account['username']}、ログイン成功")
                data = response.json()
                if 'session' in data and 'access_token' in data['session']:
                    return data['session']['access_token']

        print(f"✗ 認証失敗: {account['username']} - {response.text}")
        return None

    except Exception as e:
        print(f"✗ 認証エラー: {account['username']} - {e}")
        return None


def get_theme_for_category(api_base: str, category: str, access_token: str) -> dict | None:
    """指定カテゴリーの今日のテーマを取得"""
    try:
        response = requests.get(
            f"{api_base}/themes/today",
            headers={"Authorization": f"Bearer {access_token}"},
            params={"category": category},
            timeout=10.0,
        )

        if response.status_code == 200:
            return response.json()
        else:
            print(f"✗ テーマ取得失敗: {category} - {response.text}")
            return None

    except Exception as e:
        print(f"✗ テーマ取得エラー: {category} - {e}")
        return None


def post_work(api_base: str, theme_id: str, text: str, access_token: str) -> dict | None:
    """作品を投稿"""
    try:
        response = requests.post(
            f"{api_base}/works",
            headers={"Authorization": f"Bearer {access_token}"},
            json={
                "theme_id": theme_id,
                "text": text
            },
            timeout=10.0,
        )

        if response.status_code in [200, 201]:
            return response.json()
        else:
            print(f"✗ 投稿失敗: {response.text}")
            return None

    except Exception as e:
        print(f"✗ 投稿エラー: {e}")
        return None


def main() -> int:
    args = _parse_args()
    settings = get_settings()

    print("=" * 80)
    print("AI生成サンプル作品投稿スクリプト")
    print("=" * 80)
    print(f"API Base: {args.api_base}")
    print(f"使用アカウント数: {min(args.accounts, len(SAMPLE_ACCOUNTS))}")
    print(f"カテゴリー毎の投稿数: {args.per_category}")
    print(f"Dry Run: {args.dry_run}")
    print()

    # AI クライアントを初期化
    try:
        ai_client = resolve_work_ai_client()
        print(f"✓ AI Client initialized: {settings.theme_ai_provider}")
    except WorkAIClientError as exc:
        print(f"✗ AI Client初期化失敗: {exc}")
        return 1

    total_posted = 0
    total_failed = 0

    # 日替わりでアカウントを選択（日付ベースのランダムシード）
    accounts_to_use = select_daily_accounts(args.accounts)

    # カテゴリーごとに処理
    for category in CATEGORIES:
        print(f"\n{'=' * 80}")
        print(f"カテゴリー: {category}")
        print('=' * 80)

        # カテゴリーごとに投稿するアカウントをグループ相性を考慮して選択
        group_affinity = CATEGORY_GROUP_AFFINITY.get(category, [])

        # アカウントを派閥で分類
        accounts_by_group = {group: [] for group in ACCOUNT_GROUPS.keys()}
        for account in accounts_to_use:
            for group_name, group_members in ACCOUNT_GROUPS.items():
                if account in group_members:
                    accounts_by_group[group_name].append(account)
                    break

        # 相性順にアカウントを集める
        sorted_accounts = []
        for group_name in group_affinity:
            sorted_accounts.extend(accounts_by_group.get(group_name, []))

        # 残りのアカウントも追加（万が一分類されていないものがあれば）
        for account in accounts_to_use:
            if account not in sorted_accounts:
                sorted_accounts.append(account)

        # 上位から指定数を選択
        selected_accounts = sorted_accounts[:min(args.per_category, len(sorted_accounts))]

        print(f"選択されたアカウント: {', '.join([acc['username'] for acc in selected_accounts])}")

        for account in selected_accounts:
            print(f"\n--- {account['username']} ({category}) ---")

            # ユーザー認証
            access_token = create_or_login_user(args.api_base, account)
            if not access_token:
                print(f"✗ 認証失敗: {account['username']}")
                total_failed += 1
                continue

            # テーマ取得
            theme = get_theme_for_category(args.api_base, category, access_token)
            if not theme:
                print(f"✗ テーマ取得失敗: {category}")
                total_failed += 1
                continue

            upper_verse = theme['text']
            print(f"上の句: {upper_verse.replace(chr(10), ' / ')}")

            # AIで下の句を生成（ペルソナを渡す）
            try:
                lower_verse = ai_client.generate(
                    upper_verse=upper_verse,
                    category=category,
                    username=account['username'],
                    persona=account.get('persona', '')
                )
                print(f"下の句（AI生成）: {lower_verse.replace(chr(10), ' / ')}")
            except WorkAIClientError as exc:
                print(f"✗ AI生成失敗: {exc}")
                total_failed += 1
                continue

            # 投稿（Dry Run でなければ実行）
            if args.dry_run:
                print(f"[DRY RUN] 投稿スキップ")
                total_posted += 1
            else:
                work = post_work(args.api_base, theme['id'], lower_verse, access_token)
                if work:
                    print(f"✓ 投稿成功: ID={work.get('id', 'unknown')}")
                    total_posted += 1
                else:
                    print("✗ 投稿失敗")
                    total_failed += 1

            # APIレート制限対策として少し待機
            time.sleep(1.0)

    print("\n" + "=" * 80)
    print(f"完了: 成功={total_posted} / 失敗={total_failed}")
    print("=" * 80)

    return 0 if total_failed == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
