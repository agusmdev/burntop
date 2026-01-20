"""drop_referral_click_table

Revision ID: a1b2c3d4e5f6
Revises: d41ecac2caf1
Create Date: 2026-01-08 21:52:02.000000+00:00

"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "a1b2c3d4e5f6"
down_revision: str | None = "d41ecac2caf1"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Drop the referral_clicks table."""
    # Drop indexes first
    op.drop_index(op.f("ix_referral_clicks_deleted_at"), table_name="referral_clicks")
    op.drop_index(op.f("ix_referral_clicks_clicked_at"), table_name="referral_clicks")
    op.drop_index(op.f("ix_referral_clicks_referral_code"), table_name="referral_clicks")
    op.drop_index(op.f("ix_referral_clicks_referrer_id"), table_name="referral_clicks")

    # Drop table with CASCADE to handle any foreign key dependencies
    op.drop_table("referral_clicks")


def downgrade() -> None:
    """Recreate the referral_clicks table."""
    op.create_table(
        "referral_clicks",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("referral_code", sa.String(length=20), nullable=False),
        sa.Column(
            "referrer_id",
            sa.UUID(),
            nullable=False,
        ),
        sa.Column("ip_address", sa.String(length=45), nullable=True),
        sa.Column("user_agent", sa.String(length=500), nullable=True),
        sa.Column("referrer", sa.String(length=500), nullable=True),
        sa.Column("converted", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column(
            "converted_user_id",
            sa.UUID(),
            nullable=True,
        ),
        sa.Column(
            "clicked_at",
            sa.DateTime(timezone=True),
            nullable=False,
        ),
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
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(
            ["referrer_id"], ["users.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["converted_user_id"], ["users.id"], ondelete="SET NULL"
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    # Recreate indexes
    op.create_index(
        op.f("ix_referral_clicks_referrer_id"),
        "referral_clicks",
        ["referrer_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_referral_clicks_referral_code"),
        "referral_clicks",
        ["referral_code"],
        unique=False,
    )
    op.create_index(
        op.f("ix_referral_clicks_clicked_at"),
        "referral_clicks",
        ["clicked_at"],
        unique=False,
    )
    op.create_index(
        op.f("ix_referral_clicks_deleted_at"),
        "referral_clicks",
        ["deleted_at"],
        unique=False,
    )
