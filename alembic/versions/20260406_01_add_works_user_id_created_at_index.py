"""Add index on works(user_id, created_at) for my works query performance.

Works list queries for a specific user (マイページ) use WHERE user_id = ? ORDER BY created_at DESC.
The existing composite unique index (user_id, theme_id) does not cover ORDER BY created_at,
so adding (user_id, created_at DESC) improves OFFSET pagination and general list performance.

Revision ID: 20260406_01
Revises: 20251210_01
Create Date: 2026-04-06
"""

from __future__ import annotations

from alembic import op

# revision identifiers, used by Alembic.
revision = "20260406_01"
down_revision = "20250105_01"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add composite index on works(user_id, created_at DESC)."""
    op.create_index(
        "idx_works_user_id_created_at",
        "works",
        ["user_id", "created_at"],
        postgresql_ops={"created_at": "DESC"},
    )


def downgrade() -> None:
    """Remove composite index on works(user_id, created_at)."""
    op.drop_index("idx_works_user_id_created_at", table_name="works")
