"""fix_security_definer_view

Fix views to use SECURITY INVOKER instead of SECURITY DEFINER.
This ensures that RLS policies are enforced for the querying user.

Revision ID: b5fd322ce747
Revises: 20251020_01
Create Date: 2025-10-29
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "b5fd322ce747"
down_revision = "20251020_01"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Recreate views with explicit SECURITY INVOKER to enforce RLS."""

    # Drop existing view
    op.execute("DROP VIEW IF EXISTS works_with_metrics;")

    # Recreate with explicit SECURITY INVOKER
    op.execute("""
        CREATE OR REPLACE VIEW works_with_metrics
        WITH (security_invoker = true) AS
        SELECT
          w.*,
          COALESCE(lc.likes_count, 0) AS likes_count
        FROM works w
        LEFT JOIN (
          SELECT work_id, COUNT(*)::INT AS likes_count
          FROM likes
          GROUP BY work_id
        ) lc ON lc.work_id = w.id;
    """)


def downgrade() -> None:
    """Revert to view without explicit security setting."""

    op.execute("DROP VIEW IF EXISTS works_with_metrics;")

    op.execute("""
        CREATE OR REPLACE VIEW works_with_metrics AS
        SELECT
          w.*,
          COALESCE(lc.likes_count, 0) AS likes_count
        FROM works w
        LEFT JOIN (
          SELECT work_id, COUNT(*)::INT AS likes_count
          FROM likes
          GROUP BY work_id
        ) lc ON lc.work_id = w.id;
    """)
