"""Activity model definition."""

from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import ForeignKey, Index, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core import Base, TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from app.user.models import User


class Activity(UUIDMixin, TimestampMixin, Base):
    """
    Activity model representing a user activity in the system.

    Activities are public events that appear in feeds, such as streak milestones,
    badge earned, rank changes, and other notable actions. They are visible to followers.
    """

    __tablename__ = "activities"

    # Foreign key
    user_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Activity type
    type: Mapped[str] = mapped_column(
        String(50), nullable=False, index=True
    )  # streak_milestone, badge_earned, rank_change, etc.

    # Additional data (flexible JSONB for type-specific data)
    # Note: Named 'data' instead of 'metadata' to avoid conflict with SQLAlchemy's Base.metadata
    data: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="activities")

    # Indexes for efficient queries
    __table_args__ = (
        Index("ix_activities_user_created", "user_id", "created_at"),
        Index("ix_activities_type_created", "type", "created_at"),
    )

    def __repr__(self) -> str:
        """String representation of Activity."""
        return (
            f"<Activity(id={self.id!r}, user_id={self.user_id!r}, "
            f"type={self.type!r}, created_at={self.created_at})>"
        )
