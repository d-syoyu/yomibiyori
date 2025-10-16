"""SQLAlchemy model for ranking snapshots."""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, ForeignKey, Integer, Numeric
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Ranking(Base):
    """Represents a precomputed ranking snapshot for a theme."""

    __tablename__ = "rankings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    theme_id: Mapped[str] = mapped_column(ForeignKey("themes.id", ondelete="CASCADE"), index=True)
    work_id: Mapped[str] = mapped_column(ForeignKey("works.id", ondelete="CASCADE"), index=True)
    score: Mapped[Decimal] = mapped_column(Numeric(8, 5))
    rank: Mapped[int] = mapped_column(Integer)
    snapshot_time: Mapped[datetime] = mapped_column(DateTime(timezone=True))

    work: Mapped["Work"] = relationship("Work")
    theme: Mapped["Theme"] = relationship("Theme")
