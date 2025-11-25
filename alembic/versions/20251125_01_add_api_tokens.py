"""Add api_tokens table for external API token storage.

Revision ID: 20251125_01
Revises: 02e43a1d2075
Create Date: 2025-11-25
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "20251125_01"
down_revision = "02e43a1d2075"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Create api_tokens table."""

    op.create_table(
        "api_tokens",
        sa.Column("id", sa.String(50), primary_key=True),
        sa.Column("access_token", sa.Text(), nullable=False),
        sa.Column("user_id", sa.String(100), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )

    # Trigger for updated_at
    op.execute(
        """
        CREATE TRIGGER trg_api_tokens_updated_at
        BEFORE UPDATE ON api_tokens
        FOR EACH ROW EXECUTE FUNCTION app_public.set_updated_at();
        """
    )

    op.execute("COMMENT ON TABLE api_tokens IS 'External API tokens (e.g., Threads) with expiration tracking';")
    op.execute("COMMENT ON COLUMN api_tokens.id IS 'Token identifier (e.g., threads)';")
    op.execute("COMMENT ON COLUMN api_tokens.access_token IS 'The actual access token value';")
    op.execute("COMMENT ON COLUMN api_tokens.user_id IS 'Platform-specific user ID';")
    op.execute("COMMENT ON COLUMN api_tokens.expires_at IS 'Token expiration timestamp';")


def downgrade() -> None:
    """Drop api_tokens table."""

    op.execute("DROP TRIGGER IF EXISTS trg_api_tokens_updated_at ON api_tokens;")
    op.drop_table("api_tokens")
