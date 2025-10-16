"""SQLAlchemy model for user-submitted works."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Work(Base):
    """Represents a haiku submitted by a user for a specific theme."""

    __tablename__ = "works"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    theme_id: Mapped[str] = mapped_column(ForeignKey("themes.id", ondelete="CASCADE"))
    text: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))

    author: Mapped["User"] = relationship("User", back_populates="works")
    theme: Mapped["Theme"] = relationship("Theme", back_populates="works")
    likes: Mapped[list["Like"]] = relationship(
        "Like",
        back_populates="work",
        cascade="all, delete-orphan",
    )
