"""Community benchmark models for aggregate statistics and insights."""

from sqlalchemy import BigInteger, Integer, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.models import Base, TimestampMixin, UUIDMixin


class CommunityBenchmark(UUIDMixin, TimestampMixin, Base):
    """
    Community-wide aggregate statistics and benchmarks.

    Stores periodic snapshots of community metrics for comparison with individual user stats.
    Updated by background task on a regular schedule (e.g., hourly or daily).

    Attributes:
        id: UUID primary key
        period: Time period for this benchmark (all, month, week)
        total_users: Total number of active users in the period
        avg_tokens: Average tokens used per user
        median_tokens: Median tokens used per user
        avg_cost: Average cost per user (USD)
        avg_streak: Average streak length
        avg_unique_tools: Average number of unique tools used
        avg_cache_efficiency: Average cache efficiency percentage (0-100)
        total_community_tokens: Total tokens used by all users in the community
        created_at: When this benchmark was created (from TimestampMixin)
        updated_at: When this benchmark was last updated (from TimestampMixin)
    """

    # Period for this benchmark (all, month, week)
    period: Mapped[str] = mapped_column(String(20), nullable=False, index=True, unique=True)

    # Total number of active users
    total_users: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    # Token statistics (BigInteger to handle values > 2.1B)
    avg_tokens: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    median_tokens: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    total_community_tokens: Mapped[int | None] = mapped_column(BigInteger, nullable=True)

    # Cost statistics (USD with 4 decimal precision)
    avg_cost: Mapped[float | None] = mapped_column(Numeric(10, 4), nullable=True)

    # Streak statistics
    avg_streak: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # Tool usage statistics
    avg_unique_tools: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # Efficiency statistics (percentage 0-100 with 2 decimal precision)
    avg_cache_efficiency: Mapped[float | None] = mapped_column(Numeric(5, 2), nullable=True)

    def __repr__(self) -> str:
        """String representation of CommunityBenchmark."""
        return (
            f"<CommunityBenchmark(period={self.period!r}, "
            f"total_users={self.total_users}, "
            f"avg_tokens={self.avg_tokens})>"
        )
