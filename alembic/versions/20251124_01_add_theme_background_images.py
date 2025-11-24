"""Add background_image_url to sponsor_themes and themes.

Revision ID: 20251124_01
Revises: 20251115_02
Create Date: 2025-11-24
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "20251124_01"
down_revision = "20251115_02"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add background_image_url to sponsor themes and published themes."""
    op.add_column(
        "sponsor_themes",
        sa.Column("background_image_url", sa.Text(), nullable=True),
    )
    op.add_column(
        "themes",
        sa.Column("background_image_url", sa.Text(), nullable=True),
    )

    op.execute(
        "comment on column sponsor_themes.background_image_url is 'お題背景画像の公開URL（任意）';"
    )
    op.execute(
        "comment on column themes.background_image_url is 'お題の背景画像URL（スポンサー指定があればコピーされる）';"
    )


def downgrade() -> None:
    """Remove background_image_url columns."""
    op.drop_column("themes", "background_image_url")
    op.drop_column("sponsor_themes", "background_image_url")
