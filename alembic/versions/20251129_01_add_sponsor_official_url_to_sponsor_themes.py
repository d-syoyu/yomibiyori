"""Add sponsor_official_url column to sponsor_themes table.

This allows each sponsor theme to have its own URL, separate from the sponsor's profile URL.
Enables campaign-specific or event-specific URLs for each theme.

Revision ID: 20251129_01
Revises: 20251128_01
Create Date: 2025-11-29
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "20251129_01"
down_revision = "20251128_01"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add sponsor_official_url column to sponsor_themes."""
    op.add_column(
        "sponsor_themes",
        sa.Column("sponsor_official_url", sa.Text, nullable=True),
    )

    # Add comment for documentation
    op.execute(
        "COMMENT ON COLUMN sponsor_themes.sponsor_official_url IS "
        "'お題ごとのスポンサーリンクURL（キャンペーンやイベント固有のURL）'"
    )


def downgrade() -> None:
    """Remove sponsor_official_url column from sponsor_themes."""
    op.drop_column("sponsor_themes", "sponsor_official_url")
