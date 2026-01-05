"""Add profile_image_url column to users table.

Revision ID: 20250105_01
Revises: 02e43a1d2075
Create Date: 2025-01-05
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20250105_01"
down_revision = "02e43a1d2075"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("profile_image_url", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "profile_image_url")
