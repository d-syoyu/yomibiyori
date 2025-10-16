"""SQLAlchemy model for daily themes."""

from __future__ import annotations

from datetime import datetime, date

from sqlalchemy import Boolean, Date, DateTime, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Theme(Base):
    """Represents a haiku theme distributed on a specific date."""

    __tablename__ = "themes"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    text: Mapped[str] = mapped_column(Text)
    category: Mapped[str] = mapped_column(String(50))
    date: Mapped[date] = mapped_column(Date)
    sponsored: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))

    works: Mapped[list["Work"]] = relationship(
        "Work",
        back_populates="theme",
        cascade="all, delete-orphan",
    )
