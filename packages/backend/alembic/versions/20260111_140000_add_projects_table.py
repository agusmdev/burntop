"""add_projects_table

Revision ID: h8i9j0k1l2m3
Revises: f864422eed1f
Create Date: 2026-01-11 14:00:00.000000+00:00

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "h8i9j0k1l2m3"
down_revision: str | None = "f864422eed1f"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Create projects table for user portfolio items."""
    op.create_table(
        "projects",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("url", sa.String(length=2048), nullable=False),
        sa.Column("title", sa.String(length=500), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("og_image_url", sa.String(length=2048), nullable=True),
        sa.Column("og_description", sa.Text(), nullable=True),
        sa.Column("favicon_url", sa.String(length=2048), nullable=True),
        sa.Column("is_featured", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("display_order", sa.Integer(), nullable=False, server_default="0"),
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
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            ondelete="CASCADE",
        ),
    )
    # Index on user_id for efficient lookups
    op.create_index(op.f("ix_projects_user_id"), "projects", ["user_id"], unique=False)
    # Index for soft delete filtering
    op.create_index(
        op.f("ix_projects_deleted_at"), "projects", ["deleted_at"], unique=False
    )
    # Composite index for user projects ordered by display_order
    op.create_index(
        "ix_projects_user_display", "projects", ["user_id", "display_order"], unique=False
    )
    # Composite index for filtering featured projects per user
    op.create_index(
        "ix_projects_user_featured", "projects", ["user_id", "is_featured"], unique=False
    )


def downgrade() -> None:
    """Drop projects table."""
    op.drop_index("ix_projects_user_featured", table_name="projects")
    op.drop_index("ix_projects_user_display", table_name="projects")
    op.drop_index(op.f("ix_projects_deleted_at"), table_name="projects")
    op.drop_index(op.f("ix_projects_user_id"), table_name="projects")
    op.drop_table("projects")
