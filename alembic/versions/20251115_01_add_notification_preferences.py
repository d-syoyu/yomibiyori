"""Add notification preference toggles for theme release and ranking results.

Revision ID: 20251115_01
Revises: 20250102_01
Create Date: 2025-11-15
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "20251115_01"
down_revision = "20250102_01"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add boolean flags to control notification delivery per user."""

    op.add_column(
        "users",
        sa.Column(
            "notify_theme_release",
            sa.Boolean(),
            nullable=False,
            server_default="true",
            comment="Receive 06:00 theme release notifications",
        ),
    )
    op.add_column(
        "users",
        sa.Column(
            "notify_ranking_result",
            sa.Boolean(),
            nullable=False,
            server_default="true",
            comment="Receive 22:00 ranking result notifications",
        ),
    )

    # Remove server defaults so future inserts must provide a value explicitly/defaults
    op.alter_column("users", "notify_theme_release", server_default=None)
    op.alter_column("users", "notify_ranking_result", server_default=None)


def downgrade() -> None:
    """Remove notification preference flags."""

    op.drop_column("users", "notify_ranking_result")
    op.drop_column("users", "notify_theme_release")
