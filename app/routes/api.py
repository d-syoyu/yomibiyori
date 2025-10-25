"""Aggregate API router."""

from fastapi import APIRouter

from app.routes import auth, ranking, themes, works, push

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(themes.router, prefix="/themes", tags=["themes"])
api_router.include_router(works.router, prefix="/works", tags=["works"])
api_router.include_router(ranking.router, prefix="/ranking", tags=["ranking"])
api_router.include_router(push.router, prefix="/push-subscriptions", tags=["notifications"])
