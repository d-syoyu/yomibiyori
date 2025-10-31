"""SQLAlchemy model for application users."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from sqlalchemy import Boolean, DateTime, Integer, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class User(Base):
    """Represents an end user synchronised with Supabase Auth."""

    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String(80))
    email: Mapped[str] = mapped_column(String(320), unique=True)
    role: Mapped[str] = mapped_column(String(20), default="user")
    birth_year: Mapped[int | None] = mapped_column(Integer, nullable=True)
    prefecture: Mapped[str | None] = mapped_column(String(50), nullable=True)
    device_info: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
    analytics_opt_out: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))

    works: Mapped[list["Work"]] = relationship(
        "Work",
        back_populates="author",
        cascade="all, delete-orphan",
    )
