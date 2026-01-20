"""change_xp_to_bigint

Revision ID: 6dcf8c64c4b0
Revises: 8bc6cb110cd4
Create Date: 2026-01-06 22:52:57.639664+00:00

"""
from collections.abc import Sequence

# revision identifiers, used by Alembic.
revision: str = '6dcf8c64c4b0'
down_revision: str | None = '8bc6cb110cd4'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade database schema."""
    pass


def downgrade() -> None:
    """Downgrade database schema."""
    pass
