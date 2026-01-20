"""drop_user_achievements_table

Revision ID: e5f6g7h8i9j0
Revises: 9a1c16b5b4c8
Create Date: 2026-01-09 18:00:00.000000+00:00

"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "e5f6g7h8i9j0"
down_revision: str | None = "9a1c16b5b4c8"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Drop the user_achievements table with CASCADE to handle dependencies."""
    # Drop indexes first
    op.drop_index("ix_user_achievements_user_unlocked", table_name="user_achievements")
    op.drop_index("ix_user_achievements_user_pinned", table_name="user_achievements")
    op.drop_index(op.f("ix_user_achievements_user_id"), table_name="user_achievements")
    op.drop_index(op.f("ix_user_achievements_achievement_id"), table_name="user_achievements")

    # Drop the table with CASCADE
    op.drop_table("user_achievements")


def downgrade() -> None:
    """Recreate the user_achievements table."""
    op.create_table(
        "user_achievements",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("achievement_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("unlocked_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
        sa.Column("progress", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("tier", sa.Integer(), nullable=False, server_default=sa.text("1")),
        sa.Column("is_pinned", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name="fk_user_achievements_user_id",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["achievement_id"],
            ["achievements.id"],
            name="fk_user_achievements_achievement_id",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "achievement_id", name="uq_user_achievement_user_achievement"),
    )

    # Recreate indexes
    op.create_index("ix_user_achievements_user_id", "user_achievements", ["user_id"])
    op.create_index("ix_user_achievements_achievement_id", "user_achievements", ["achievement_id"])
    op.create_index("ix_user_achievements_user_unlocked", "user_achievements", ["user_id", "unlocked_at"])
    op.create_index("ix_user_achievements_user_pinned", "user_achievements", ["user_id", "is_pinned"])
