"""Create synced_message_ids table for message-level deduplication.

This table tracks which message IDs have been synced from CLI clients,
enabling idempotent sync operations. Running sync twice with the same
data will not double-count tokens.

Revision ID: 20260121_100000
Revises: i9j0k1l2m3n4
Create Date: 2026-01-21

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "20260121_100000"
down_revision: str | None = "i9j0k1l2m3n4"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Create synced_message_ids table."""
    op.create_table(
        "synced_message_ids",
        # Primary key
        sa.Column(
            "id",
            sa.UUID(),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        # Foreign key to user
        sa.Column("user_id", sa.UUID(), nullable=False),
        # Message ID from parser (UUID, bubbleId, task ULID, etc.)
        sa.Column("message_id", sa.String(100), nullable=False),
        # Source tool identifier (claude-code, cursor, cline, etc.)
        sa.Column("source", sa.String(50), nullable=False),
        # Timestamp when this message was synced
        sa.Column(
            "synced_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("NOW()"),
            nullable=False,
        ),
        # Primary key constraint
        sa.PrimaryKeyConstraint("id", name="pk_synced_message_ids"),
        # Foreign key constraint
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name="fk_synced_message_ids_user_id",
            ondelete="CASCADE",
        ),
        # Unique constraint: same message from same user/source is a duplicate
        sa.UniqueConstraint(
            "user_id",
            "source",
            "message_id",
            name="uq_user_source_message",
        ),
    )

    # Index for efficient lookups by user and source
    op.create_index(
        "ix_synced_message_ids_user_source",
        "synced_message_ids",
        ["user_id", "source"],
    )

    # Index for cleanup queries (by synced_at)
    op.create_index(
        "ix_synced_message_ids_synced_at",
        "synced_message_ids",
        ["synced_at"],
    )


def downgrade() -> None:
    """Drop synced_message_ids table."""
    op.drop_index("ix_synced_message_ids_synced_at", table_name="synced_message_ids")
    op.drop_index("ix_synced_message_ids_user_source", table_name="synced_message_ids")
    op.drop_table("synced_message_ids")
