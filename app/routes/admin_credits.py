"""Admin endpoints for managing sponsor credits."""

from datetime import datetime, timezone
from typing import Annotated
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.logging import logger
from app.db.session import get_authenticated_db_session
from app.models.sponsor import Sponsor
from app.models.sponsor_credit_transaction import SponsorCreditTransaction
from app.models.user import User
from app.routes.admin import get_current_admin
from app.schemas.credit_purchase import CreditTransactionResponse

router = APIRouter(prefix="/admin/sponsors", tags=["Admin - Credits"])


@router.get("/{sponsor_id}/transactions")
def get_sponsor_credit_transactions(
    sponsor_id: str,
    current_admin: Annotated[User, Depends(get_current_admin)],
    session: Annotated[Session, Depends(get_authenticated_db_session)],
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    """Get all credit transactions for a specific sponsor (admin only)."""
    # Verify sponsor exists
    sponsor = session.get(Sponsor, sponsor_id)
    if not sponsor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sponsor not found",
        )

    # Get transactions
    stmt = (
        select(SponsorCreditTransaction)
        .where(SponsorCreditTransaction.sponsor_id == sponsor_id)
        .order_by(SponsorCreditTransaction.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    transactions = session.scalars(stmt).all()

    # Get total count
    count_stmt = (
        select(func.count())
        .select_from(SponsorCreditTransaction)
        .where(SponsorCreditTransaction.sponsor_id == sponsor_id)
    )
    total = session.scalar(count_stmt) or 0

    return {
        "transactions": [CreditTransactionResponse.model_validate(t) for t in transactions],
        "total": total,
        "sponsor": {
            "id": sponsor.id,
            "company_name": sponsor.company_name,
            "current_credits": sponsor.credits,
        },
    }


@router.post("/{sponsor_id}/credits/adjust")
def adjust_sponsor_credits(
    sponsor_id: str,
    current_admin: Annotated[User, Depends(get_current_admin)],
    session: Annotated[Session, Depends(get_authenticated_db_session)],
    amount: int = Query(..., description="Amount to adjust (positive or negative)"),
    description: str = Query(..., description="Reason for adjustment"),
):
    """Manually adjust sponsor credits (admin only). Can add or remove credits."""
    sponsor = session.get(Sponsor, sponsor_id)
    if not sponsor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sponsor not found",
        )

    # Check if adjustment would result in negative credits
    new_balance = sponsor.credits + amount
    if new_balance < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Adjustment would result in negative balance: current={sponsor.credits}, adjustment={amount}, result={new_balance}",
        )

    # Update credits
    sponsor.credits = new_balance

    # Create transaction record
    now = datetime.now(timezone.utc)
    transaction = SponsorCreditTransaction(
        id=str(uuid4()),
        sponsor_id=sponsor.id,
        amount=amount,
        transaction_type="admin_adjustment",
        description=f"Admin adjustment by {current_admin.email}: {description}",
        created_at=now,
    )
    session.add(transaction)
    session.commit()
    session.refresh(transaction)

    logger.info(
        f"Admin {current_admin.email} adjusted credits for sponsor {sponsor.id} by {amount}: {description}"
    )

    return {
        "transaction": CreditTransactionResponse.model_validate(transaction),
        "new_balance": sponsor.credits,
        "message": f"Credits adjusted by {amount}. New balance: {sponsor.credits}",
    }
