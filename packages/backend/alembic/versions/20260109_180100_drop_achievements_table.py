"""drop_achievements_table

Revision ID: f6g7h8i9j0k1
Revises: e5f6g7h8i9j0
Create Date: 2026-01-09 18:01:00.000000+00:00

"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "f6g7h8i9j0k1"
down_revision: str | None = "e5f6g7h8i9j0"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Drop the achievements table with CASCADE to handle dependencies."""
    # First, drop the foreign key constraint from activities table
    op.drop_constraint("activities_achievement_id_fkey", "activities", type_="foreignkey")

    # Drop the achievement_id index from activities
    op.drop_index(op.f("ix_activities_achievement_id"), table_name="activities")

    # Drop the achievement_id column from activities
    op.drop_column("activities", "achievement_id")

    # Now drop the achievements table indexes
    op.drop_index(op.f("ix_achievements_rarity"), table_name="achievements")
    op.drop_index(op.f("ix_achievements_name"), table_name="achievements")
    op.drop_index(op.f("ix_achievements_category"), table_name="achievements")

    # Drop the achievements table
    op.drop_table("achievements")


def downgrade() -> None:
    """Recreate the achievements table and restore activities.achievement_id."""
    # Recreate achievements table first
    op.create_table(
        "achievements",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("description", sa.String(length=500), nullable=False),
        sa.Column("category", sa.String(length=50), nullable=False),
        sa.Column("rarity", sa.String(length=20), nullable=False),
        sa.Column("xp_reward", sa.Integer(), nullable=False),
        sa.Column("icon_url", sa.String(length=500), nullable=True),
        sa.Column("is_hidden", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )

    # Recreate achievements indexes
    op.create_index(op.f("ix_achievements_category"), "achievements", ["category"], unique=False)
    op.create_index(op.f("ix_achievements_name"), "achievements", ["name"], unique=True)
    op.create_index(op.f("ix_achievements_rarity"), "achievements", ["rarity"], unique=False)

    # Add back achievement_id column to activities
    op.add_column(
        "activities",
        sa.Column("achievement_id", postgresql.UUID(as_uuid=True), nullable=True),
    )

    # Recreate the foreign key constraint
    op.create_foreign_key(
        "activities_achievement_id_fkey",
        "activities",
        "achievements",
        ["achievement_id"],
        ["id"],
        ondelete="SET NULL",
    )

    # Recreate the index
    op.create_index(op.f("ix_activities_achievement_id"), "activities", ["achievement_id"], unique=False)
