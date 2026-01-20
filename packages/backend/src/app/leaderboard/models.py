"""Leaderboard cache models for efficient ranking queries."""

from typing import TYPE_CHECKING

from sqlalchemy import BigInteger, ForeignKey, Integer, Numeric, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core import Base, TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from app.user.models import User


class LeaderboardCache(UUIDMixin, TimestampMixin, Base):
    """Cached leaderboard rankings sorted by total tokens.

    Simplified leaderboard with single ranking type (by total tokens).
    Supports filtering by time period (all, month, week).
    """

    __tablename__ = "leaderboard_cache"

    user_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    period: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        index=True,
        comment="Time period (all, month, week)",
    )

    rank: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        index=True,
        comment="User's rank on this leaderboard",
    )

    total_tokens: Mapped[int] = mapped_column(
        BigInteger,
        nullable=False,
        default=0,
        comment="Total tokens used",
    )

    total_cost: Mapped[float | None] = mapped_column(
        Numeric(10, 4),
        nullable=True,
        comment="Total cost in USD",
    )

    streak_days: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
        comment="Current streak in days",
    )

    rank_change: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
        comment="Change in rank since last update (positive = up, negative = down)",
    )

    user: Mapped["User"] = relationship(
        back_populates="leaderboard_cache",
        lazy="selectin",
    )

    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "period",
            name="uq_leaderboard_cache_user_period",
        ),
    )
