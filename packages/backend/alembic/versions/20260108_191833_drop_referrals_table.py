"""drop_referrals_table

Revision ID: b2c3d4e5f6g7
Revises: a1b2c3d4e5f6
Create Date: 2026-01-08 19:18:33.000000+00:00

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "b2c3d4e5f6g7"
down_revision: str | None = "a1b2c3d4e5f6"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Drop the referrals table."""
    # Drop indexes first
    op.drop_index(op.f("ix_referrals_referee_id"), table_name="referrals")
    op.drop_index(op.f("ix_referrals_referrer_id"), table_name="referrals")

    # Drop table with CASCADE to handle any foreign key dependencies
    op.drop_table("referrals")


def downgrade() -> None:
    """Recreate the referrals table."""
    op.create_table(
        "referrals",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column(
            "referrer_id",
            sa.UUID(),
            nullable=False,
        ),
        sa.Column(
            "referee_id",
            sa.UUID(),
            nullable=False,
        ),
        sa.Column("level", sa.Integer(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["referee_id"], ["users.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["referrer_id"], ["users.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    # Recreate indexes
    op.create_index(
        op.f("ix_referrals_referrer_id"),
        "referrals",
        ["referrer_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_referrals_referee_id"),
        "referrals",
        ["referee_id"],
        unique=False,
    )
