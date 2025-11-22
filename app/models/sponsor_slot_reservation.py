"""Sponsor slot reservation model."""

from datetime import date, datetime
from uuid import UUID

from sqlalchemy import Date, DateTime, ForeignKey, Index, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class SponsorSlotReservation(Base):
    """Sponsor slot reservation for a specific date and category."""

    __tablename__ = "sponsor_slot_reservations"

    id: Mapped[UUID] = mapped_column(primary_key=True)
    sponsor_id: Mapped[UUID] = mapped_column(ForeignKey("sponsors.id", ondelete="CASCADE"))
    date: Mapped[date] = mapped_column(Date, nullable=False)
    category: Mapped[str] = mapped_column(String(50), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="reserved")  # reserved/used/cancelled
    reserved_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    # Relationships
    sponsor: Mapped["Sponsor"] = relationship("Sponsor", back_populates="slot_reservations")
    themes: Mapped[list["SponsorTheme"]] = relationship("SponsorTheme", back_populates="reservation")

    __table_args__ = (
        UniqueConstraint("date", "category", name="uq_sponsor_slot_date_category"),
        Index("ix_sponsor_slot_reservations_sponsor_id", "sponsor_id"),
        Index("ix_sponsor_slot_reservations_date", "date"),
        Index("ix_sponsor_slot_reservations_status", "status"),
    )
