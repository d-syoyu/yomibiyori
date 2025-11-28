"""Pydantic schemas for credit purchases."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class CreditPurchaseCreate(BaseModel):
    """Request to purchase credits."""

    quantity: int = Field(..., ge=1, le=100, description="Number of credits to purchase (1-100)")
    success_url: str = Field(..., description="URL to redirect after successful payment")
    cancel_url: str = Field(..., description="URL to redirect if payment is cancelled")


class CreditPurchaseSessionResponse(BaseModel):
    """Response containing Stripe Checkout session information."""

    session_id: str = Field(..., description="Stripe Checkout Session ID")
    url: str = Field(..., description="URL to redirect user to Stripe Checkout")


class CreditTransactionResponse(BaseModel):
    """Response for a credit transaction."""

    id: UUID
    sponsor_id: UUID
    amount: int
    transaction_type: str  # purchase/use/refund/admin_adjustment
    description: str | None
    stripe_payment_intent_id: str | None
    created_at: datetime

    class Config:
        from_attributes = True


class CreditPricingResponse(BaseModel):
    """Response containing bulk discount pricing information."""

    quantity: int = Field(..., description="Total credits to receive")
    free_credits: int = Field(..., description="Number of free credits included")
    paid_credits: int = Field(..., description="Number of credits actually paid for")
    unit_price: int = Field(..., description="Base price per credit in JPY")
    subtotal: int = Field(..., description="Price without discount in JPY")
    total: int = Field(..., description="Final price after discount in JPY")
    discount_amount: int = Field(..., description="Total savings in JPY")
    discount_percent: int = Field(..., description="Discount percentage")
