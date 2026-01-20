"""Project model definition."""

from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import Boolean, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core import Base, SoftDeleteMixin, TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from app.user.models import User


class Project(UUIDMixin, TimestampMixin, SoftDeleteMixin, Base):
    """
    Project model representing a user's project/portfolio item.

    Stores user-submitted project URLs along with Open Graph metadata
    fetched from those URLs. Projects are displayed on the user's profile
    to showcase their work.
    """

    __tablename__ = "projects"

    # Foreign key to user
    user_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Project URL (required)
    url: Mapped[str] = mapped_column(String(2048), nullable=False)

    # User-provided or OG-fetched metadata
    title: Mapped[str | None] = mapped_column(String(500), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Open Graph metadata from URL
    og_image_url: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    og_description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Favicon
    favicon_url: Mapped[str | None] = mapped_column(String(2048), nullable=True)

    # Display options
    is_featured: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    display_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="projects")

    # Indexes for efficient queries
    __table_args__ = (
        Index("ix_projects_user_display", "user_id", "display_order"),
        Index("ix_projects_user_featured", "user_id", "is_featured"),
    )

    def __repr__(self) -> str:
        """String representation of Project."""
        return (
            f"<Project(id={self.id!r}, user_id={self.user_id!r}, "
            f"url={self.url!r}, title={self.title!r})>"
        )
