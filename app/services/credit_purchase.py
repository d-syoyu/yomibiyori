"""Service layer for credit purchases via Stripe."""

from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.logging import logger
from app.models.sponsor import Sponsor
from app.models.sponsor_credit_transaction import SponsorCreditTransaction

settings = get_settings()


def calculate_bulk_discount(quantity: int, unit_price: int = 11000) -> dict:
    """Calculate bulk discount pricing (Buy 3, Get 1 Free).

    Every 4 credits, 1 is free (25% discount per 4-pack).

    Args:
        quantity: Number of credits to purchase
        unit_price: Base price per credit in JPY

    Returns:
        Dictionary with pricing details:
        - quantity: Total credits received
        - free_credits: Number of free credits
        - paid_credits: Number of credits actually paid for
        - unit_price: Base price per credit
        - subtotal: Price without discount
        - total: Final price after discount
        - discount_amount: Total savings
        - discount_percent: Discount percentage
    """
    free_credits = quantity // 4
    paid_credits = quantity - free_credits
    subtotal = quantity * unit_price
    total = paid_credits * unit_price
    discount_amount = subtotal - total

    return {
        "quantity": quantity,
        "free_credits": free_credits,
        "paid_credits": paid_credits,
        "unit_price": unit_price,
        "subtotal": subtotal,
        "total": total,
        "discount_amount": discount_amount,
        "discount_percent": round((discount_amount / subtotal) * 100) if subtotal > 0 else 0,
    }


class StripeMissingAPIKeyError(Exception):
    """Raised when Stripe API key is not configured."""

    pass


def get_or_create_stripe_customer(
    db_session: Session,
    sponsor: Sponsor,
) -> str:
    """Get existing or create new Stripe Customer for a sponsor.

    Args:
        db_session: Database session
        sponsor: Sponsor model instance

    Returns:
        Stripe Customer ID
    """
    import stripe

    stripe.api_key = settings.stripe_api_key

    # Return existing customer if available
    if sponsor.stripe_customer_id:
        return sponsor.stripe_customer_id

    # Create new Stripe Customer
    customer = stripe.Customer.create(
        name=sponsor.company_name,
        email=sponsor.contact_email,
        metadata={
            "sponsor_id": sponsor.id,
        },
    )

    # Save customer ID to database
    sponsor.stripe_customer_id = customer.id
    db_session.commit()

    logger.info(f"Created Stripe Customer {customer.id} for sponsor {sponsor.id}")

    return customer.id


def create_checkout_session(
    db_session: Session,
    sponsor: Sponsor,
    quantity: int,
    success_url: str,
    cancel_url: str,
) -> tuple[str, str]:
    """Create a Stripe Checkout session for credit purchase.

    Args:
        db_session: Database session
        sponsor: Sponsor model instance
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

        # Get or create Stripe Customer (required for bank transfer)
        customer_id = get_or_create_stripe_customer(db_session, sponsor)

        # Calculate bulk discount pricing (Buy 3, Get 1 Free)
        unit_price = settings.sponsor_credit_price_jpy
        pricing = calculate_bulk_discount(quantity, unit_price)

        # Build description with discount info
        if pricing["free_credits"] > 0:
            description = (
                f"{quantity}クレジット（{pricing['free_credits']}クレジットプレゼント）"
                f" - お題の作成に利用できます"
            )
        else:
            description = f"{quantity}クレジット - お題の作成に利用できます"

        # Create Checkout Session with multiple payment methods
        # User can choose payment method on Stripe's UI
        session = stripe.checkout.Session.create(
            customer=customer_id,
            payment_method_types=["card", "customer_balance"],
            payment_method_options={
                "customer_balance": {
                    "funding_type": "bank_transfer",
                    "bank_transfer": {
                        "type": "jp_bank_transfer",
                    },
                },
            },
            line_items=[
                {
                    "price_data": {
                        "currency": "jpy",
                        "product_data": {
                            "name": "よみびより スポンサークレジット",
                            "description": description,
                        },
                        "unit_amount": unit_price,
                    },
                    # Charge only for paid credits (free credits are not charged)
                    "quantity": pricing["paid_credits"],
                }
            ],
            mode="payment",
            allow_promotion_codes=True,  # Enable coupon/promotion codes
            success_url=success_url,
            cancel_url=cancel_url,
            client_reference_id=sponsor.id,
            metadata={
                "sponsor_id": sponsor.id,
                "credit_quantity": quantity,
            },
        )

        logger.info(
            f"Created Stripe Checkout session {session.id} for sponsor {sponsor.id}, quantity: {quantity}"
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
