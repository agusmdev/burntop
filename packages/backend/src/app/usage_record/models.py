"""UsageRecord model definition."""

from datetime import date as date_type, datetime
from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import Date, DateTime, ForeignKey, Index, Integer, Numeric, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core import Base, TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from app.user.models import User


class UsageRecord(UUIDMixin, TimestampMixin, Base):
    """
    UsageRecord model representing AI usage data for a user.

    Tracks token usage across different AI models and sources.
    Each record represents aggregated usage for a specific date, source, and model.
    """

    # Foreign key to user
    user_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Usage metadata
    date: Mapped[date_type] = mapped_column(Date, nullable=False, index=True)
    source: Mapped[str] = mapped_column(
        String(50), nullable=False, index=True
    )  # cursor, claude-code, web, etc.
    model: Mapped[str] = mapped_column(
        String(100), nullable=False, index=True
    )  # claude-3-5-sonnet-20241022, etc.
    machine_id: Mapped[str] = mapped_column(
        String(50), nullable=False, default="default", index=True
    )  # Machine identifier for multi-machine sync

    # Token counts
    input_tokens: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    output_tokens: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    cache_read_tokens: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    cache_write_tokens: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    reasoning_tokens: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Cost calculation
    cost: Mapped[float] = mapped_column(
        Numeric(10, 4), default=0.0, nullable=False
    )  # USD with 4 decimal precision

    # Timestamps
    usage_timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True
    )
    synced_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default="NOW()"
    )

    # Relationship to user
    user: Mapped["User"] = relationship("User", back_populates="usage_records")

    # Unique constraint to prevent duplicate records (includes machine_id for multi-machine sync)
    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "date",
            "source",
            "model",
            "machine_id",
            name="uq_usage_record_user_date_source_model_machine",
        ),
        Index("ix_usage_records_user_date", "user_id", "date"),
        Index("ix_usage_records_user_source_model", "user_id", "source", "model"),
        Index("ix_usage_records_user_machine", "user_id", "machine_id"),
    )

    def __repr__(self) -> str:
        """String representation of UsageRecord."""
        return (
            f"<UsageRecord(id={self.id!r}, user_id={self.user_id!r}, "
            f"date={self.date!r}, source={self.source!r}, model={self.model!r}, "
            f"machine_id={self.machine_id!r})>"
        )

    @property
    def total_tokens(self) -> int:
        """Calculate total tokens (input + output + cache_read + cache_write + reasoning)."""
        return (
            self.input_tokens
            + self.output_tokens
            + self.cache_read_tokens
            + self.cache_write_tokens
            + self.reasoning_tokens
        )

    @property
    def cache_efficiency(self) -> float:
        """
        Calculate cache efficiency percentage.

        Efficiency is the percentage of input-type tokens that were served from cache.
        This measures how effective prompt caching is at reducing input costs.

        Returns:
            Percentage of cache read tokens vs total input tokens (0-100)
        """
        total_input = self.input_tokens + self.cache_read_tokens
        if total_input == 0:
            return 0.0
        return (self.cache_read_tokens / total_input) * 100
