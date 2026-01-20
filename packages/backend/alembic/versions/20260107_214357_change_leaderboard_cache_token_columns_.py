"""change leaderboard cache token columns to bigint

Revision ID: 461920f4f18c
Revises: 6dcf8c64c4b0
Create Date: 2026-01-07 21:43:57.292646+00:00

"""
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = '461920f4f18c'
down_revision: str | None = '6dcf8c64c4b0'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade database schema."""
    op.alter_column('leaderboard_cache', 'total_tokens',
               existing_type=sa.INTEGER(),
               type_=sa.BigInteger(),
               existing_comment='Total tokens used',
               existing_nullable=True)
    op.alter_column('leaderboard_cache', 'reasoning_tokens',
               existing_type=sa.INTEGER(),
               type_=sa.BigInteger(),
               existing_comment='Total reasoning tokens used',
               existing_nullable=True)


def downgrade() -> None:
    """Downgrade database schema."""
    op.alter_column('leaderboard_cache', 'reasoning_tokens',
               existing_type=sa.BigInteger(),
               type_=sa.INTEGER(),
               existing_comment='Total reasoning tokens used',
               existing_nullable=True)
    op.alter_column('leaderboard_cache', 'total_tokens',
               existing_type=sa.BigInteger(),
               type_=sa.INTEGER(),
               existing_comment='Total tokens used',
               existing_nullable=True)
