"""Service layer for sponsor slot reservations."""

from datetime import date, datetime, timezone
from uuid import UUID, uuid4

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.sponsor import Sponsor
from app.models.sponsor_slot_reservation import SponsorSlotReservation
from app.models.sponsor_credit_transaction import SponsorCreditTransaction


class InsufficientCreditsError(Exception):
    """Raised when sponsor doesn't have enough credits."""

    pass


class SlotAlreadyReservedError(Exception):
    """Raised when slot is already reserved by another sponsor."""

    pass


class SlotNotFoundError(Exception):
    """Raised when reservation not found."""

    pass


def check_slot_availability(
    session: Session,
    target_date: date,
    category: str,
) -> tuple[bool, SponsorSlotReservation | None]:
    """Check if a slot is available for reservation.

    Args:
        session: Database session
        target_date: Date to check
        category: Category to check

    Returns:
        Tuple of (is_available, existing_reservation)
    """
    stmt = (
        select(SponsorSlotReservation)
        .where(SponsorSlotReservation.date == target_date)
        .where(SponsorSlotReservation.category == category)
        .where(SponsorSlotReservation.status == "reserved")
    )
    existing = session.scalar(stmt)

    return (existing is None, existing)


def create_slot_reservation(
    session: Session,
    sponsor_id: str,
    target_date: date,
    category: str,
) -> SponsorSlotReservation:
    """Reserve a slot for a sponsor.

    This function:
    1. Checks if sponsor has enough credits
    2. Checks if slot is available (no existing reservation)
    3. Creates the reservation
    4. Deducts 1 credit from sponsor
    5. Records the transaction

    Args:
        session: Database session
        sponsor_id: Sponsor ID
        target_date: Date to reserve
        category: Category to reserve

    Returns:
        Created reservation

    Raises:
        InsufficientCreditsError: If sponsor doesn't have credits
        SlotAlreadyReservedError: If slot is already reserved
    """
    # Get sponsor
    sponsor = session.get(Sponsor, sponsor_id)
    if not sponsor:
        raise ValueError(f"Sponsor {sponsor_id} not found")

    # Check credits
    if sponsor.credits < 1:
        raise InsufficientCreditsError(
            f"Insufficient credits. Current: {sponsor.credits}, Required: 1"
        )

    # Check availability
    is_available, existing = check_slot_availability(session, target_date, category)
    if not is_available:
        raise SlotAlreadyReservedError(
            f"Slot for {target_date} / {category} is already reserved"
        )

    now = datetime.now(timezone.utc)

    # Create reservation
    reservation = SponsorSlotReservation(
        id=str(uuid4()),
        sponsor_id=sponsor_id,
        date=target_date,
        category=category,
        status="reserved",
        reserved_at=now,
        created_at=now,
        updated_at=now,
    )

    try:
        session.add(reservation)
        session.flush()  # Get the ID before committing

        # Deduct credit
        sponsor.credits -= 1

        # Record transaction
        transaction = SponsorCreditTransaction(
            id=str(uuid4()),
            sponsor_id=sponsor_id,
            amount=-1,
            transaction_type="use",
            description=f"Slot reservation: {target_date} / {category}",
            created_at=now,
        )
        session.add(transaction)

        session.commit()
        session.refresh(reservation)

        return reservation

    except IntegrityError as e:
        session.rollback()
        # This can happen if another request reserved the same slot concurrently
        if "uq_sponsor_slot_date_category" in str(e):
            raise SlotAlreadyReservedError(
                f"Slot for {target_date} / {category} was just reserved by another sponsor"
            )
        raise


def cancel_slot_reservation(
    session: Session,
    reservation_id: str,
    sponsor_id: str,
) -> SponsorSlotReservation:
    """Cancel a slot reservation and refund the credit.

    Args:
        session: Database session
        reservation_id: Reservation ID to cancel
        sponsor_id: Sponsor ID (for authorization)

    Returns:
        Updated reservation

    Raises:
        SlotNotFoundError: If reservation not found
        ValueError: If reservation doesn't belong to sponsor or already cancelled
    """
    reservation = session.get(SponsorSlotReservation, reservation_id)
    if not reservation:
        raise SlotNotFoundError(f"Reservation {reservation_id} not found")

    if reservation.sponsor_id != sponsor_id:
        raise ValueError("This reservation does not belong to you")

    if reservation.status != "reserved":
        raise ValueError(f"Cannot cancel reservation with status: {reservation.status}")

    # Get sponsor
    sponsor = session.get(Sponsor, sponsor_id)
    if not sponsor:
        raise ValueError(f"Sponsor {sponsor_id} not found")

    now = datetime.now(timezone.utc)

    # Update reservation status
    reservation.status = "cancelled"
    reservation.updated_at = now

    # Refund credit
    sponsor.credits += 1

    # Record transaction
    transaction = SponsorCreditTransaction(
        id=str(uuid4()),
        sponsor_id=sponsor_id,
        amount=1,
        transaction_type="refund",
        description=f"Refund for cancelled slot: {reservation.date} / {reservation.category}",
        created_at=now,
    )
    session.add(transaction)

    session.commit()
    session.refresh(reservation)

    return reservation


def get_sponsor_reservations(
    session: Session,
    sponsor_id: str,
    status: str | None = None,
) -> list[SponsorSlotReservation]:
    """Get all reservations for a sponsor.

    Args:
        session: Database session
        sponsor_id: Sponsor ID
        status: Optional status filter (reserved/used/cancelled)

    Returns:
        List of reservations
    """
    stmt = (
        select(SponsorSlotReservation)
        .where(SponsorSlotReservation.sponsor_id == sponsor_id)
        .order_by(SponsorSlotReservation.date.desc())
    )

    if status:
        stmt = stmt.where(SponsorSlotReservation.status == status)

    return list(session.scalars(stmt))


def get_available_slots(
    session: Session,
    start_date: date,
    end_date: date,
) -> list[dict]:
    """Get all available slots in a date range.

    Args:
        session: Database session
        start_date: Start date (inclusive)
        end_date: End date (inclusive)

    Returns:
        List of slot availability information
    """
    categories = ["恋愛", "季節", "日常", "ユーモア"]

    # Get all reserved slots in the date range
    stmt = (
        select(SponsorSlotReservation)
        .where(SponsorSlotReservation.date >= start_date)
        .where(SponsorSlotReservation.date <= end_date)
        .where(SponsorSlotReservation.status == "reserved")
    )
    reserved_slots = list(session.scalars(stmt))

    # Create a map of (date, category) -> reservation
    reserved_map = {(r.date, r.category): r for r in reserved_slots}

    # Generate all possible slots and mark availability
    from datetime import timedelta

    result = []
    current_date = start_date
    while current_date <= end_date:
        for category in categories:
            reservation = reserved_map.get((current_date, category))
            result.append(
                {
                    "date": current_date,
                    "category": category,
                    "is_available": reservation is None,
                    "reserved_by_sponsor_id": (
                        reservation.sponsor_id if reservation else None
                    ),
                    "reserved_at": reservation.reserved_at if reservation else None,
                }
            )
        current_date += timedelta(days=1)

    return result
