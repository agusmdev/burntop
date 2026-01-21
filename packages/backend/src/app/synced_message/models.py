"""SyncedMessageId model for tracking synced messages."""

from datetime import UTC, datetime
from uuid import UUID, uuid4

from sqlalchemy import DateTime, ForeignKey, Index, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.core import Base


class SyncedMessageId(Base):
    """
    Tracks which message IDs have been synced from CLI clients.

    This enables message-level deduplication for idempotent sync operations.
    Running `burntop sync` twice with the same data will not double-count tokens.

    Deduplication key: (user_id, source, message_id)
    - Same message from same user/source = duplicate
    - Same message ID from different sources = OK (IDs are source-scoped)
    """

    __tablename__ = "synced_message_ids"

    # Primary key
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)

    # Foreign key to user
    user_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )

    # Message ID from parser - this is the parser's native ID
    # Examples: UUID from Claude Code, bubbleId from Cursor, task ULID from Cline
    message_id: Mapped[str] = mapped_column(String(100), nullable=False)

    # Source tool identifier (claude-code, cursor, cline, continue, etc.)
    source: Mapped[str] = mapped_column(String(50), nullable=False)

    # Timestamp when this message was synced
    synced_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )

    __table_args__ = (
        # Unique constraint for deduplication
        UniqueConstraint("user_id", "source", "message_id", name="uq_user_source_message"),
        # Index for efficient lookups
        Index("ix_synced_message_ids_user_source", "user_id", "source"),
        # Index for cleanup queries
        Index("ix_synced_message_ids_synced_at", "synced_at"),
    )

    def __repr__(self) -> str:
        """String representation of SyncedMessageId."""
        return (
            f"<SyncedMessageId(id={self.id!r}, user_id={self.user_id!r}, "
            f"source={self.source!r}, message_id={self.message_id!r})>"
        )
