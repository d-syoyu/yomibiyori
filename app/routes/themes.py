"""Routes for themes resource."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db_session
from app.schemas.theme import ThemeResponse
from app.services import themes as themes_service

router = APIRouter()


@router.get(
    "/today",
    response_model=ThemeResponse,
    summary="Get today's theme",
)
def get_today_theme(
    session: Annotated[Session, Depends(get_db_session)],
) -> ThemeResponse:
    """Return the theme for today's date in JST timezone.

    If multiple themes exist for different categories, returns the most recent.
    """
    return themes_service.get_today_theme(session=session)
