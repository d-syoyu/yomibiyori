"""SQLAlchemy model for unified sponsor notifications."""

from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import uuid4

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.db.types import JSONBType


class SponsorNotification(Base):
    """Unified sponsor notifications (themes, account, credits, etc.)."""

    __tablename__ = "sponsor_notifications"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    sponsor_id: Mapped[str] = mapped_column(
        String, ForeignKey("sponsors.id", ondelete="CASCADE"), nullable=False, index=True
    )
    type: Mapped[str] = mapped_column(String(50), nullable=False)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    sponsor_theme_id: Mapped[str | None] = mapped_column(
        String, ForeignKey("sponsor_themes.id", ondelete="CASCADE"), nullable=True
    )
    extra_data: Mapped[dict[str, Any] | None] = mapped_column(JSONBType, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
