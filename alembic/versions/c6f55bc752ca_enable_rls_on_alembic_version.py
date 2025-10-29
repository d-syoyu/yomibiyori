"""enable_rls_on_alembic_version

Enable Row Level Security on alembic_version table.
This table is for internal migration management and should not be
accessible via PostgREST API.

Revision ID: c6f55bc752ca
Revises: b5fd322ce747
Create Date: 2025-10-29
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "c6f55bc752ca"
down_revision = "b5fd322ce747"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Enable RLS on alembic_version and restrict all access."""

    # Enable RLS on alembic_version table
    op.execute("ALTER TABLE alembic_version ENABLE ROW LEVEL SECURITY;")

    # No policies needed - this effectively blocks all access via PostgREST
    # Only the database owner and superuser can access this table
    # which is appropriate for a migration management table


def downgrade() -> None:
    """Disable RLS on alembic_version table."""

    op.execute("ALTER TABLE alembic_version DISABLE ROW LEVEL SECURITY;")
