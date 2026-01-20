"""Follow model for user following relationships."""

from datetime import datetime
from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import DateTime, ForeignKey, PrimaryKeyConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core import Base

if TYPE_CHECKING:
    from app.user.models import User


class Follow(Base):
    """
    Follow model for many-to-many self-referential user relationships.

    Represents a follower/following relationship between two users.
    Uses composite primary key (follower_id, following_id).
    """

    __tablename__ = "follows"

    # Composite primary key (follower_id, following_id)
    follower_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
        index=True,
    )
    following_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
        index=True,
    )

    # Timestamp when the follow relationship was created
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True,
    )

    # Relationships
    # Match User model: followers/following relationships
    follower: Mapped["User"] = relationship(
        "User",
        foreign_keys=[follower_id],
        back_populates="following",
        lazy="selectin",
    )
    following: Mapped["User"] = relationship(
        "User",
        foreign_keys=[following_id],
        back_populates="followers",
        lazy="selectin",
    )

    __table_args__ = (PrimaryKeyConstraint("follower_id", "following_id", name="pk_follows"),)

    def __repr__(self) -> str:
        """String representation of the Follow instance."""
        return f"<Follow follower={self.follower_id} following={self.following_id}>"
