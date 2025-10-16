"""SQLAlchemy model for likes on works."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Like(Base):
    """Represents a user like (kansha) for a work."""

    __tablename__ = "likes"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    work_id: Mapped[str] = mapped_column(ForeignKey("works.id", ondelete="CASCADE"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))

    work: Mapped["Work"] = relationship("Work", back_populates="likes")
