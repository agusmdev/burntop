"""drop_level_and_xp_from_users

Revision ID: g7h8i9j0k1l2
Revises: f6g7h8i9j0k1
Create Date: 2026-01-10 10:00:00.000000+00:00

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "g7h8i9j0k1l2"
down_revision: str | None = "f6g7h8i9j0k1"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Drop level and xp columns from users table."""
    op.drop_column("users", "level")
    op.drop_column("users", "xp")


def downgrade() -> None:
    """Recreate level and xp columns in users table."""
    op.add_column(
        "users",
        sa.Column("xp", sa.BigInteger(), nullable=False, server_default="0"),
    )
    op.add_column(
        "users",
        sa.Column("level", sa.Integer(), nullable=False, server_default="1"),
    )
