"""API endpoints for sponsor slot reservations."""

from datetime import date, timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db.session import get_authenticated_db_session
from app.routes.auth import get_current_sponsor
from app.models.user import User
from app.schemas.slot_reservation import (
    SlotAvailability,
    SlotReservationCreate,
    SlotReservationResponse,
    SlotReservationCancel,
)
from app.services import slot_reservation as slot_service

router = APIRouter(prefix="/slots", tags=["Sponsor Slot Reservations"])


@router.get("/availability", response_model=list[SlotAvailability])
def get_slot_availability(
    start_date: Annotated[date | None, Query(description="Start date (default: today)")] = None,
    end_date: Annotated[date | None, Query(description="End date (default: 30 days from start)")] = None,
    current_user: Annotated[User, Depends(get_current_sponsor)] = None,
    session: Annotated[Session, Depends(get_authenticated_db_session)] = None,
):
    """Get available slots for reservation in a date range.

    Returns all slots (date × category combinations) with availability status.
    """
    if not start_date:
        start_date = date.today()

    if not end_date:
        end_date = start_date + timedelta(days=30)

    if end_date < start_date:
        raise HTTPException(status_code=400, detail="end_date must be >= start_date")

    if (end_date - start_date).days > 90:
        raise HTTPException(status_code=400, detail="Date range cannot exceed 90 days")

    slots = slot_service.get_available_slots(session, start_date, end_date)

    return [SlotAvailability(**slot) for slot in slots]


@router.post("/reserve", response_model=SlotReservationResponse, status_code=201)
def reserve_slot(
    payload: SlotReservationCreate,
    current_user: Annotated[User, Depends(get_current_sponsor)] = None,
    session: Annotated[Session, Depends(get_authenticated_db_session)] = None,
):
    """Reserve a slot for a specific date and category.

    Requires:
    - Sponsor must have at least 1 credit
    - Slot must be available (not already reserved)

    Deducts 1 credit from sponsor upon successful reservation.
    """
    # Validate date (must be in the future)
    if payload.date < date.today():
        raise HTTPException(status_code=400, detail="Cannot reserve slots in the past")

    # Validate category
    valid_categories = ["恋愛", "季節", "日常", "ユーモア"]
    if payload.category not in valid_categories:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid category. Must be one of: {', '.join(valid_categories)}",
        )

    try:
        reservation = slot_service.create_slot_reservation(
            session=session,
            sponsor_id=current_user.id,
            target_date=payload.date,
            category=payload.category,
        )
        return SlotReservationResponse.model_validate(reservation)

    except slot_service.InsufficientCreditsError as e:
        raise HTTPException(status_code=402, detail=str(e))  # 402 Payment Required

    except slot_service.SlotAlreadyReservedError as e:
        raise HTTPException(status_code=409, detail=str(e))  # 409 Conflict


@router.post("/cancel", response_model=SlotReservationResponse)
def cancel_reservation(
    payload: SlotReservationCancel,
    current_user: Annotated[User, Depends(get_current_sponsor)] = None,
    session: Annotated[Session, Depends(get_authenticated_db_session)] = None,
):
    """Cancel a slot reservation and refund the credit.

    Only reservations with status='reserved' can be cancelled.
    """
    try:
        reservation = slot_service.cancel_slot_reservation(
            session=session,
            reservation_id=str(payload.reservation_id),
            sponsor_id=current_user.id,
        )
        return SlotReservationResponse.model_validate(reservation)

    except slot_service.SlotNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/my-reservations", response_model=list[SlotReservationResponse])
def get_my_reservations(
    status: Annotated[str | None, Query(description="Filter by status (reserved/used/cancelled)")] = None,
    current_user: Annotated[User, Depends(get_current_sponsor)] = None,
    session: Annotated[Session, Depends(get_authenticated_db_session)] = None,
):
    """Get all reservations for the current sponsor.

    Optionally filter by status.
    """
    if status and status not in ["reserved", "used", "cancelled"]:
        raise HTTPException(
            status_code=400,
            detail="Invalid status. Must be one of: reserved, used, cancelled",
        )

    reservations = slot_service.get_sponsor_reservations(
        session=session,
        sponsor_id=current_user.id,
        status=status,
    )

    return [SlotReservationResponse.model_validate(r) for r in reservations]
