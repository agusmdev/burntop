"""drop_referral_code_column

Revision ID: c3d4e5f6g7h8
Revises: b2c3d4e5f6g7
Create Date: 2026-01-08 22:15:00.000000+00:00

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "c3d4e5f6g7h8"
down_revision: str | None = "b2c3d4e5f6g7"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Drop the referral_code column from users table."""
    # Drop the unique index first
    op.drop_index(op.f("ix_users_referral_code"), table_name="users")

    # Drop the column
    op.drop_column("users", "referral_code")


def downgrade() -> None:
    """Recreate the referral_code column in users table."""
    # Add the column back
    op.add_column(
        "users",
        sa.Column("referral_code", sa.String(length=20), nullable=True),
    )

    # Recreate the unique index
    op.create_index(
        op.f("ix_users_referral_code"),
        "users",
        ["referral_code"],
        unique=True,
    )
