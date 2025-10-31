"""Add user attributes (birth_year, prefecture, device_info).

Revision ID: 20250102_01
Revises: 20250101_01
Create Date: 2025-01-02
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "20250102_01"
down_revision = "20250101_01"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add user attribute columns for demographic data collection."""

    # Add birth_year column
    op.add_column(
        "users",
        sa.Column(
            "birth_year",
            sa.Integer(),
            nullable=True,
            comment="Year of birth (e.g., 1990)",
        ),
    )

    # Add check constraint for valid birth years
    op.create_check_constraint(
        "ck_users_birth_year",
        "users",
        "birth_year IS NULL OR (birth_year >= 1900 AND birth_year <= 2025)",
    )

    # Add prefecture column
    op.add_column(
        "users",
        sa.Column(
            "prefecture",
            sa.String(50),
            nullable=True,
            comment="User's prefecture (e.g., '東京都', '大阪府')",
        ),
    )

    # Add device_info column (JSONB for flexible device data)
    op.add_column(
        "users",
        sa.Column(
            "device_info",
            postgresql.JSONB(),
            nullable=True,
            comment="Device information: {platform, os_version, timezone, locale}",
        ),
    )

    # Add analytics_opt_out column for privacy preferences
    op.add_column(
        "users",
        sa.Column(
            "analytics_opt_out",
            sa.Boolean(),
            nullable=False,
            server_default="false",
            comment="User has opted out of analytics tracking",
        ),
    )
    op.alter_column("users", "analytics_opt_out", server_default=None)

    # Create index on birth_year for analytics queries
    op.create_index(
        "idx_users_birth_year",
        "users",
        ["birth_year"],
        postgresql_where=sa.text("birth_year IS NOT NULL"),
    )

    # Create index on prefecture for regional analytics
    op.create_index(
        "idx_users_prefecture",
        "users",
        ["prefecture"],
        postgresql_where=sa.text("prefecture IS NOT NULL"),
    )


def downgrade() -> None:
    """Remove user attribute columns."""

    # Drop indexes
    op.drop_index("idx_users_prefecture", "users")
    op.drop_index("idx_users_birth_year", "users")

    # Drop columns
    op.drop_column("users", "analytics_opt_out")
    op.drop_column("users", "device_info")
    op.drop_column("users", "prefecture")

    # Drop check constraint
    op.drop_constraint("ck_users_birth_year", "users", type_="check")
    op.drop_column("users", "birth_year")
