"""
Base SQLAlchemy models and mixins.

Provides reusable mixins for UUID primary keys, timestamps, and soft delete functionality.
All entity models should inherit from Base and use these mixins as needed.
"""

import re
from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import DateTime, func
from sqlalchemy.dialects.postgresql import JSONB, UUID as PG_UUID
from sqlalchemy.ext.asyncio import AsyncAttrs
from sqlalchemy.orm import DeclarativeBase, Mapped, declared_attr, mapped_column


class Base(AsyncAttrs, DeclarativeBase):
    """
    Base class for all SQLAlchemy models.

    Includes AsyncAttrs for proper async lazy loading support.
    All models should inherit from this class.
    """

    @declared_attr.directive
    def __tablename__(cls) -> str:
        """
        Generate table name from class name.

        Converts CamelCase to snake_case and pluralizes.
        Example: UserProfile -> user_profiles
        """
        name = re.sub(r"(?<!^)(?=[A-Z])", "_", cls.__name__).lower()
        return f"{name}s"


class UUIDMixin:
    """
    Mixin that adds a UUID primary key.

    Uses PostgreSQL's native UUID type.
    Generates UUID4 by default.
    """

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        primary_key=True,
        default=uuid4,
        sort_order=-100,  # Ensure id appears first in table
    )


class TimestampMixin:
    """
    Mixin that adds created_at and updated_at timestamps.

    - created_at: Set once when record is created (server-side default)
    - updated_at: Updated automatically on every modification

    All timestamps are timezone-aware UTC.
    """

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        sort_order=100,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
        sort_order=101,
    )


class SoftDeleteMixin:
    """
    Mixin that adds soft delete functionality.

    - deleted_at: NULL means not deleted, timestamp means deleted
    - Records are never physically deleted, only marked

    Repositories should filter out soft-deleted records by default.
    """

    deleted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        default=None,
        index=True,  # Index for efficient filtering
        sort_order=102,
    )

    @property
    def is_deleted(self) -> bool:
        """Check if the record is soft deleted."""
        return self.deleted_at is not None
