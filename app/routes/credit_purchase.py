"""API endpoints for credit purchases."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Header, Request
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.logging import logger
from app.db.session import get_authenticated_db_session, get_db_session
from app.routes.auth import get_current_sponsor
from app.models.user import User
from app.schemas.credit_purchase import (
    CreditPurchaseCreate,
    CreditPurchaseSessionResponse,
    CreditTransactionResponse,
)
from app.services import credit_purchase as credit_service

settings = get_settings()
router = APIRouter(prefix="/credits", tags=["Sponsor Credits"])


@router.post("/purchase", response_model=CreditPurchaseSessionResponse, status_code=201)
def create_purchase_session(
    payload: CreditPurchaseCreate,
    current_user: Annotated[User, Depends(get_current_sponsor)] = None,
):
    """Create a Stripe Checkout session for purchasing credits.

    Returns a session ID and URL to redirect the user to Stripe Checkout.
    """
    try:
        session_id, checkout_url = credit_service.create_checkout_session(
            sponsor_id=current_user.id,
            quantity=payload.quantity,
            success_url=payload.success_url,
            cancel_url=payload.cancel_url,
        )

        return CreditPurchaseSessionResponse(
            session_id=session_id,
            url=checkout_url,
        )

    except credit_service.StripeMissingAPIKeyError as e:
        raise HTTPException(status_code=503, detail=str(e))


@router.post("/webhook")
async def stripe_webhook(
    request: Request,
    stripe_signature: Annotated[str | None, Header(alias="Stripe-Signature")] = None,
    session: Annotated[Session, Depends(get_db_session)] = None,
):
    """Handle Stripe webhook events.

    This endpoint is called by Stripe when payment events occur.
    It verifies the webhook signature and processes successful payments.
    """
    if not settings.stripe_webhook_secret:
        logger.error("Stripe webhook secret is not configured")
        raise HTTPException(status_code=503, detail="Webhook not configured")

    if not stripe_signature:
        raise HTTPException(status_code=400, detail="Missing Stripe-Signature header")

    try:
        import stripe

        stripe.api_key = settings.stripe_api_key

        # Get raw body
        payload = await request.body()

        # Verify signature
        try:
            event = stripe.Webhook.construct_event(
                payload,
                stripe_signature,
                settings.stripe_webhook_secret,
            )
        except stripe.error.SignatureVerificationError as e:
            logger.error(f"Invalid Stripe webhook signature: {e}")
            raise HTTPException(status_code=400, detail="Invalid signature")

        # Handle the event
        if event["type"] == "checkout.session.completed":
            session_data = event["data"]["object"]

            # Extract sponsor_id and quantity from metadata
            sponsor_id = session_data.get("client_reference_id")
            metadata = session_data.get("metadata", {})
            quantity = int(metadata.get("credit_quantity", 0))
            payment_intent_id = session_data.get("payment_intent")

            if not sponsor_id or not quantity:
                logger.error(
                    f"Missing sponsor_id or quantity in webhook data: {session_data}"
                )
                return {"status": "error", "message": "Missing required data"}

            # Process the successful payment
            try:
                credit_service.process_successful_payment(
                    session=session,
                    sponsor_id=sponsor_id,
                    quantity=quantity,
                    payment_intent_id=payment_intent_id,
                )
                logger.info(
                    f"Successfully processed payment for sponsor {sponsor_id}: +{quantity} credits"
                )
            except Exception as e:
                logger.error(f"Failed to process payment: {e}", exc_info=True)
                return {"status": "error", "message": str(e)}

        else:
            logger.info(f"Received Stripe webhook event: {event['type']}")

        return {"status": "success"}

    except ImportError:
        logger.error("Stripe library is not installed")
        raise HTTPException(status_code=503, detail="Stripe not configured")


@router.get("/transactions", response_model=list[CreditTransactionResponse])
def get_my_transactions(
    current_user: Annotated[User, Depends(get_current_sponsor)] = None,
    session: Annotated[Session, Depends(get_authenticated_db_session)] = None,
):
    """Get all credit transactions for the current sponsor.

    Returns all purchases, uses, refunds, and adjustments.
    """
    transactions = credit_service.get_sponsor_transactions(
        session=session,
        sponsor_id=current_user.id,
    )

    return [CreditTransactionResponse.model_validate(t) for t in transactions]
