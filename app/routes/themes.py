"""Routes for themes resource."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query
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
    category: Annotated[
        str | None,
        Query(
            description="Category filter (e.g., '恋愛', '季節', '日常', 'ユーモア')",
            example="恋愛",
        ),
    ] = None,
) -> ThemeResponse:
    """Return the theme for today's date in JST timezone.

    If a category is specified, returns the theme for that category.
    If multiple themes exist for different categories and no category is specified,
    returns the most recent.
    """
    return themes_service.get_today_theme(session=session, category=category)


@router.get(
    "/{theme_id}",
    response_model=ThemeResponse,
    summary="Get theme by ID",
)
def get_theme_by_id(
    theme_id: str,
    session: Annotated[Session, Depends(get_db_session)],
) -> ThemeResponse:
    """Return a specific theme by its ID."""
    return themes_service.get_theme_by_id(session=session, theme_id=theme_id)
