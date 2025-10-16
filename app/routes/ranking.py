
"""Routes for ranking resource."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db_session
from app.schemas.ranking import RankingEntry
from app.services import ranking as ranking_service

router = APIRouter()


@router.get(
    "",
    response_model=list[RankingEntry],
    summary="Get ranking for a theme",
)
def get_ranking(
    theme_id: Annotated[str, Query(description="Theme identifier")],
    session: Annotated[Session, Depends(get_db_session)],
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
) -> list[RankingEntry]:
    """Return ranking snapshot for the requested theme."""

    return ranking_service.get_ranking(session=session, theme_id=theme_id, limit=limit)
