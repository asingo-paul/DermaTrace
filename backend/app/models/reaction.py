"""SQLAlchemy ORM models for the reactions table and reaction_products association."""

import uuid
from datetime import date, datetime, timezone

from sqlalchemy import Column, Date, DateTime, ForeignKey, String, Table, Text
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


# Association table — composite PK, no ORM class needed
ReactionProduct = Table(
    "reaction_products",
    Base.metadata,
    Column(
        "reaction_id",
        ForeignKey("reactions.id", ondelete="CASCADE"),
        primary_key=True,
        nullable=False,
    ),
    Column(
        "product_id",
        ForeignKey("products.id", ondelete="CASCADE"),
        primary_key=True,
        nullable=False,
    ),
)


class Reaction(Base):
    __tablename__ = "reactions"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    reaction_date: Mapped[date] = mapped_column(Date, nullable=False)
    severity: Mapped[str] = mapped_column(String, nullable=False)
    symptoms: Mapped[list[str]] = mapped_column(ARRAY(Text), nullable=False, default=list)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_utcnow
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_utcnow, onupdate=_utcnow
    )
