"""Service layer for credit purchases via Stripe."""

from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.logging import logger
from app.models.sponsor import Sponsor
from app.models.sponsor_credit_transaction import SponsorCreditTransaction

settings = get_settings()


class StripeMissingAPIKeyError(Exception):
    """Raised when Stripe API key is not configured."""

    pass


def create_checkout_session(
    sponsor_id: str,
    quantity: int,
    success_url: str,
    cancel_url: str,
) -> tuple[str, str]:
    """Create a Stripe Checkout session for credit purchase.

    Args:
        sponsor_id: Sponsor ID
        quantity: Number of credits to purchase
        success_url: URL to redirect after successful payment
        cancel_url: URL to redirect if payment is cancelled

    Returns:
        Tuple of (session_id, checkout_url)

    Raises:
        StripeMissingAPIKeyError: If Stripe API key is not configured
    """
    if not settings.stripe_api_key:
        raise StripeMissingAPIKeyError("Stripe API key is not configured")

    try:
        import stripe

        stripe.api_key = settings.stripe_api_key

        # Calculate total amount
        unit_price = settings.sponsor_credit_price_jpy
        total_amount = unit_price * quantity

        # Create Checkout Session
        session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            line_items=[
                {
                    "price_data": {
                        "currency": "jpy",
                        "product_data": {
                            "name": "よみびより スポンサークレジット",
                            "description": f"{quantity}クレジット - スポンサー機能の告知やお題作成に利用できます（1クレジット=税込1円）",
                        },
                        "unit_amount": unit_price,
                    },
                    "quantity": quantity,
                }
            ],
            mode="payment",
            success_url=success_url,
            cancel_url=cancel_url,
            client_reference_id=sponsor_id,  # Store sponsor_id for webhook
            metadata={
                "sponsor_id": sponsor_id,
                "credit_quantity": quantity,
            },
        )

        logger.info(
            f"Created Stripe Checkout session {session.id} for sponsor {sponsor_id}, quantity: {quantity}"
        )

        return (session.id, session.url)

    except ImportError:
        raise StripeMissingAPIKeyError(
            "Stripe library is not installed. Run: pip install stripe"
        )


def process_successful_payment(
    session: Session,
    sponsor_id: str,
    quantity: int,
    payment_intent_id: str,
) -> SponsorCreditTransaction:
    """Process a successful payment and credit the sponsor.

    Args:
        session: Database session
        sponsor_id: Sponsor ID
        quantity: Number of credits purchased
        payment_intent_id: Stripe Payment Intent ID

    Returns:
        Created transaction record
    """
    # Get sponsor
    sponsor = session.get(Sponsor, sponsor_id)
    if not sponsor:
        raise ValueError(f"Sponsor {sponsor_id} not found")

    now = datetime.now(timezone.utc)

    # Add credits
    sponsor.credits += quantity

    # Record transaction
    transaction = SponsorCreditTransaction(
        id=str(uuid4()),
        sponsor_id=sponsor_id,
        amount=quantity,
        transaction_type="purchase",
        stripe_payment_intent_id=payment_intent_id,
        description=f"Purchased {quantity} credits via Stripe",
        created_at=now,
    )
    session.add(transaction)
    session.commit()
    session.refresh(transaction)

    logger.info(
        f"Processed successful payment for sponsor {sponsor_id}: +{quantity} credits (payment_intent: {payment_intent_id})"
    )

    return transaction


def get_sponsor_transactions(
    session: Session,
    sponsor_id: str,
    transaction_type: str | None = None,
) -> list[SponsorCreditTransaction]:
    """Get all credit transactions for a sponsor.

    Args:
        session: Database session
        sponsor_id: Sponsor ID
        transaction_type: Optional filter by type (purchase/use/refund/admin_adjustment)

    Returns:
        List of transactions
    """
    from sqlalchemy import select

    stmt = (
        select(SponsorCreditTransaction)
        .where(SponsorCreditTransaction.sponsor_id == sponsor_id)
        .order_by(SponsorCreditTransaction.created_at.desc())
    )

    if transaction_type:
        stmt = stmt.where(SponsorCreditTransaction.transaction_type == transaction_type)

    return list(session.scalars(stmt))
