"""Streak model definition."""

from datetime import date as date_type
from typing import TYPE_CHECKING

from sqlalchemy import Date, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core import Base, TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from app.user.models import User


class Streak(UUIDMixin, TimestampMixin, Base):
    """
    Streak model for tracking user activity streaks.

    Tracks daily activity streaks to encourage consistent engagement.
    A "day" is determined by the user's timezone, not UTC.
    """

    __tablename__ = "streaks"

    # Foreign key to user (unique - one streak per user)
    user_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True, index=True
    )

    # Streak tracking
    current_streak: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    longest_streak: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Activity tracking
    last_active_date: Mapped[date_type | None] = mapped_column(Date, nullable=True)

    # User timezone for date calculation
    timezone: Mapped[str] = mapped_column(String(50), default="UTC", nullable=False)

    # Relationship to User
    user: Mapped["User"] = relationship("User", back_populates="streak", lazy="selectin")

    def __repr__(self) -> str:
        """String representation of Streak."""
        return (
            f"<Streak(id={self.id!r}, user_id={self.user_id!r}, "
            f"current_streak={self.current_streak}, longest_streak={self.longest_streak})>"
        )
