
"""Domain services for ranking retrieval."""

from __future__ import annotations

from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy import Select, select
from sqlalchemy.orm import Session

from app.models import Ranking, Theme, User, Work
from app.schemas.ranking import RankingEntry


def get_ranking(
    session: Session,
    *,
    theme_id: str,
    limit: int,
) -> list[RankingEntry]:
    """Fetch ranking snapshot rows for the specified theme."""

    theme = session.get(Theme, theme_id)
    if not theme:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Theme not found")

    stmt: Select[tuple[Ranking, Work, User]] = (
        select(Ranking, Work, User)
        .join(Work, Ranking.work_id == Work.id)
        .join(User, Work.user_id == User.id)
        .where(Ranking.theme_id == theme_id)
        .order_by(Ranking.rank.asc())
        .limit(limit)
    )

    rows = session.execute(stmt).all()
    if not rows:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ranking not available")

    entries: list[RankingEntry] = []
    for ranking, work, user in rows:
        score = ranking.score
        score_value = float(score) if isinstance(score, Decimal) else float(score or 0)
        user_name = user.display_name or user.handle
        entries.append(
            RankingEntry(
                rank=ranking.rank,
                work_id=ranking.work_id,
                score=score_value,
                user_name=user_name,
                text=work.text,
            )
        )

    return entries
