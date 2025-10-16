"""Aggregate API router."""

from fastapi import APIRouter

from app.routes import ranking, works

api_router = APIRouter()
api_router.include_router(works.router, prefix="/works", tags=["works"])
api_router.include_router(ranking.router, prefix="/ranking", tags=["ranking"])
