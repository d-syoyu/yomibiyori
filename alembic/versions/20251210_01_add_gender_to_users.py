"""Add gender column to users table.

Allows users to optionally specify their gender (male, female, or other).

Revision ID: 20251210_01
Revises: 20251129_01
Create Date: 2025-12-10
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "20251210_01"
down_revision = "20251129_01"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add gender column to users table."""
    # Add gender column with CHECK constraint
    op.add_column(
        "users",
        sa.Column("gender", sa.Text, nullable=True),
    )

    # Add CHECK constraint for valid gender values
    op.execute(
        "ALTER TABLE users ADD CONSTRAINT chk_users_gender "
        "CHECK (gender IS NULL OR gender IN ('male', 'female', 'other'))"
    )

    # Add index for gender column
    op.create_index(
        "idx_users_gender",
        "users",
        ["gender"],
        postgresql_where=sa.text("gender IS NOT NULL"),
    )

    # Add comment for documentation
    op.execute(
        "COMMENT ON COLUMN users.gender IS "
        "'性別: male（男性）/ female（女性）/ other（その他）'"
    )


def downgrade() -> None:
    """Remove gender column from users table."""
    op.drop_index("idx_users_gender", table_name="users")
    op.execute("ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_users_gender")
    op.drop_column("users", "gender")
