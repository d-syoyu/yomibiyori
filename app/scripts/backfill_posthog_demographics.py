"""
既存ユーザーのデモグラフィクス属性をPostHogへバックフィルするスクリプト。

対象: analytics_opt_out=False かつ birth_year / gender / prefecture のいずれかを持つユーザー

実行方法:
    python -m app.scripts.backfill_posthog_demographics

オプション:
    --dry-run   実際には送信せず対象ユーザー数と件数のみ表示
    --batch     バッチサイズ（デフォルト 100）
"""

from __future__ import annotations

import argparse
import sys
import time
from datetime import date

from sqlalchemy import or_, select

from app.core.analytics import get_posthog_client, identify_user, is_sample_account, get_email_domain
from app.db.session import SessionLocal
from app.models.user import User


_GENDER_MAP = {"male": "男性", "female": "女性", "other": "その他"}
_TODAY_YEAR = date.today().year


def _build_person_properties(user: User) -> dict:
    props: dict = {
        "display_name": user.name,
        "is_sample_account": is_sample_account(user.email),
        "email_domain": get_email_domain(user.email),
    }
    if user.birth_year:
        age = _TODAY_YEAR - user.birth_year
        props["age_group"] = f"{(age // 10) * 10}代"
    if user.gender:
        props["gender"] = _GENDER_MAP.get(user.gender, user.gender)
    if user.prefecture:
        props["prefecture"] = user.prefecture
    return props


def run(*, dry_run: bool, batch_size: int) -> None:
    client = get_posthog_client()
    if client is None and not dry_run:
        print("[Backfill] PostHog client が初期化できません。POSTHOG_API_KEY を確認してください。")
        sys.exit(1)

    session = SessionLocal()
    try:
        stmt = (
            select(User)
            .where(User.analytics_opt_out.is_(False))
            .where(
                or_(
                    User.birth_year.isnot(None),
                    User.gender.isnot(None),
                    User.prefecture.isnot(None),
                )
            )
            .order_by(User.created_at)
        )
        users = session.execute(stmt).scalars().all()
    finally:
        session.close()

    total = len(users)
    print(f"[Backfill] 対象ユーザー数: {total}")

    if dry_run:
        print("[Backfill] --dry-run モード: PostHogへの送信はスキップします")
        for user in users[:5]:
            props = _build_person_properties(user)
            print(f"  user_id={user.id}  props={props}")
        if total > 5:
            print(f"  ... 他 {total - 5} 件")
        return

    sent = 0
    failed = 0
    for i in range(0, total, batch_size):
        batch = users[i : i + batch_size]
        for user in batch:
            try:
                identify_user(
                    distinct_id=str(user.id),
                    properties=_build_person_properties(user),
                )
                sent += 1
            except Exception as e:
                print(f"[Backfill] ERROR user_id={user.id}: {e}")
                failed += 1

        print(f"[Backfill] 進捗: {min(i + batch_size, total)}/{total}")
        # PostHog SDKはバッファリングするが、バッチ間に少し待機してレート制限を回避
        time.sleep(0.1)

    # 残りのイベントをフラッシュ
    if client:
        try:
            client.shutdown()
        except Exception:
            pass

    print(f"[Backfill] 完了: 送信={sent}, 失敗={failed}")


def main() -> None:
    parser = argparse.ArgumentParser(description="PostHogデモグラフィクスバックフィル")
    parser.add_argument("--dry-run", action="store_true", help="送信せずに対象を確認する")
    parser.add_argument("--batch", type=int, default=100, help="バッチサイズ（デフォルト: 100）")
    args = parser.parse_args()

    run(dry_run=args.dry_run, batch_size=args.batch)


if __name__ == "__main__":
    main()
