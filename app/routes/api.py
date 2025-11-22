"""Aggregate API router."""

from fastapi import APIRouter

from app.routes import (
    admin,
    auth,
    credit_purchase,
    notifications,
    ranking,
    share,
    sponsor,
    slot_reservation,
    themes,
    works,
)

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(themes.router, prefix="/themes", tags=["themes"])
api_router.include_router(works.router, prefix="/works", tags=["works"])
api_router.include_router(ranking.router, prefix="/ranking", tags=["ranking"])
api_router.include_router(share.router, tags=["share"])
api_router.include_router(sponsor.router, tags=["sponsor"])
api_router.include_router(slot_reservation.router, prefix="/sponsor", tags=["sponsor"])
api_router.include_router(credit_purchase.router, prefix="/sponsor", tags=["sponsor"])
api_router.include_router(admin.router, tags=["admin"])
api_router.include_router(notifications.router)
