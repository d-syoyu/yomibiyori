"""SQLAlchemy model for daily themes."""

from __future__ import annotations

from datetime import datetime, date

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
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
    sponsor_theme_id: Mapped[str | None] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("sponsor_themes.id", ondelete="SET NULL"),
    )
    sponsor_company_name: Mapped[str | None] = mapped_column(String(200))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))

    works: Mapped[list["Work"]] = relationship(
        "Work",
        back_populates="theme",
        cascade="all, delete-orphan",
    )
