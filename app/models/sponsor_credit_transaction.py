"""Sponsor credit transaction model."""

from datetime import datetime
from uuid import UUID

from sqlalchemy import DateTime, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class SponsorCreditTransaction(Base):
    """Transaction record for sponsor credit purchases and usage."""

    __tablename__ = "sponsor_credit_transactions"

    id: Mapped[UUID] = mapped_column(primary_key=True)
    sponsor_id: Mapped[UUID] = mapped_column(ForeignKey("sponsors.id", ondelete="CASCADE"))
    amount: Mapped[int] = mapped_column(Integer, nullable=False)  # Positive for purchase, negative for use
    transaction_type: Mapped[str] = mapped_column(String(20), nullable=False)  # purchase/use/refund/admin_adjustment
    stripe_payment_intent_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    # Relationships
    sponsor: Mapped["Sponsor"] = relationship("Sponsor", back_populates="credit_transactions")

    __table_args__ = (
        Index("ix_sponsor_credit_transactions_sponsor_id", "sponsor_id"),
        Index("ix_sponsor_credit_transactions_type", "transaction_type"),
    )
