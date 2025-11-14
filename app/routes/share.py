"""
共有関連API
"""

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.db.session import get_db_session
from app.models.work import Work
from app.models.user import User
from app.models.theme import Theme
from app.utils.share_card_generator import ShareCardGenerator
from datetime import datetime

router = APIRouter(prefix="/share", tags=["share"])


@router.get("/card/{work_id}")
def generate_share_card(
    work_id: str,
    db: Session = Depends(get_db_session),
):
    """
    作品の共有カード画像を生成

    Args:
        work_id: 作品ID

    Returns:
        PNG画像
    """
    # 作品を取得
    result = db.execute(
        select(Work, User, Theme)
        .join(User, Work.user_id == User.id)
        .join(Theme, Work.theme_id == Theme.id)
        .where(Work.id == work_id)
    )
    row = result.first()

    if not row:
        raise HTTPException(status_code=404, detail="Work not found")

    work, user, theme = row

    # カテゴリラベル
    category_labels = {
        "romance": "恋愛",
        "season": "季節",
        "daily": "日常",
        "humor": "ユーモア",
    }
    category_label = category_labels.get(theme.category, theme.category)

    # 日付フォーマット
    date_label = work.created_at.strftime("%Y/%m/%d")

    # いいね数を計算
    likes_count = len(work.likes) if work.likes else 0

    # 画像生成
    generator = ShareCardGenerator()
    image_bytes = generator.generate(
        upper_text=theme.text,
        lower_text=work.text,
        author_name=user.name or "匿名",
        category=theme.category,
        category_label=category_label,
        date_label=date_label,
        badge_label=None,  # 必要に応じて追加
        caption=None,  # 必要に応じて追加
        likes_label=f"♥ {likes_count}" if likes_count > 0 else None,
        score_label=None,  # スコアは現在未実装
    )

    return Response(
        content=image_bytes.getvalue(),
        media_type="image/png",
        headers={
            "Cache-Control": "public, max-age=86400",  # 1日キャッシュ
            "Content-Disposition": f'inline; filename="yomibiyori_{work_id}.png"',
        },
    )
