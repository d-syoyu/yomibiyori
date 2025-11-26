"""Add stripe_customer_id column to sponsors table for bank transfer payments.

Revision ID: 20251126_01
Revises: 20251125_01
Create Date: 2025-11-26
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "20251126_01"
down_revision = "20251125_01"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add stripe_customer_id column to sponsors table."""
    op.add_column(
        "sponsors",
        sa.Column("stripe_customer_id", sa.String(255), nullable=True),
    )
    op.create_index(
        "idx_sponsors_stripe_customer_id",
        "sponsors",
        ["stripe_customer_id"],
    )


def downgrade() -> None:
    """Remove stripe_customer_id column from sponsors table."""
    op.drop_index("idx_sponsors_stripe_customer_id", table_name="sponsors")
    op.drop_column("sponsors", "stripe_customer_id")
