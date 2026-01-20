"""add_machine_id_to_usage_records

Revision ID: i9j0k1l2m3n4
Revises: h8i9j0k1l2m3
Create Date: 2026-01-15 10:00:00.000000+00:00

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "i9j0k1l2m3n4"
down_revision: str | None = "h8i9j0k1l2m3"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Add machine_id column to usage_records for multi-machine sync support."""
    # Add machine_id column with default value
    op.add_column(
        "usage_records",
        sa.Column(
            "machine_id",
            sa.String(50),
            nullable=False,
            server_default="default",
            comment="Machine identifier for multi-machine sync",
        ),
    )

    # Drop old unique constraint
    op.drop_constraint(
        "uq_usage_record_user_date_source_model", "usage_records", type_="unique"
    )

    # Create new unique constraint including machine_id
    op.create_unique_constraint(
        "uq_usage_record_user_date_source_model_machine",
        "usage_records",
        ["user_id", "date", "source", "model", "machine_id"],
    )

    # Add index on machine_id for faster queries
    op.create_index(
        "ix_usage_records_machine_id", "usage_records", ["machine_id"], unique=False
    )

    # Add composite index for user + machine queries
    op.create_index(
        "ix_usage_records_user_machine",
        "usage_records",
        ["user_id", "machine_id"],
        unique=False,
    )


def downgrade() -> None:
    """Remove machine_id column from usage_records."""
    # Drop new indexes
    op.drop_index("ix_usage_records_user_machine", table_name="usage_records")
    op.drop_index("ix_usage_records_machine_id", table_name="usage_records")

    # Drop new unique constraint
    op.drop_constraint(
        "uq_usage_record_user_date_source_model_machine", "usage_records", type_="unique"
    )

    # Recreate old unique constraint
    op.create_unique_constraint(
        "uq_usage_record_user_date_source_model",
        "usage_records",
        ["user_id", "date", "source", "model"],
    )

    # Drop machine_id column
    op.drop_column("usage_records", "machine_id")
