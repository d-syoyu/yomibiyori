"""Create notification_tokens table for Expo push registration.

Revision ID: 20251115_02
Revises: 20251115_01
Create Date: 2025-11-15
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "20251115_02"
down_revision = "20251115_01"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Create notification_tokens table."""

    op.create_table(
        "notification_tokens",
        sa.Column("id", sa.UUID(), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", sa.UUID(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("expo_push_token", sa.Text(), nullable=False),
        sa.Column("device_id", sa.Text(), nullable=True),
        sa.Column("platform", sa.Text(), nullable=True),
        sa.Column("app_version", sa.Text(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("last_registered_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("last_sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.UniqueConstraint("expo_push_token", name="uq_notification_tokens_push_token"),
    )

    # Trigger for updated_at
    op.execute(
        """
        create trigger trg_notification_tokens_updated_at
        before update on notification_tokens
        for each row execute function app_public.set_updated_at();
        """
    )

    op.create_index(
        "idx_notification_tokens_user_active",
        "notification_tokens",
        ["user_id"],
        unique=False,
        postgresql_where=sa.text("is_active = true"),
    )
    op.create_index(
        "idx_notification_tokens_active",
        "notification_tokens",
        ["is_active"],
    )

    op.execute("comment on table notification_tokens is 'Expo Push tokens per user/device';")
    op.execute("comment on column notification_tokens.expo_push_token is 'Exponent push token (ExponentPushToken[...])';")
    op.execute("comment on column notification_tokens.is_active is 'Token disabled after Expo errors';")


def downgrade() -> None:
    """Drop notification_tokens table."""

    op.drop_index("idx_notification_tokens_user_active", table_name="notification_tokens")
    op.drop_index("idx_notification_tokens_active", table_name="notification_tokens")
    op.execute("drop trigger if exists trg_notification_tokens_updated_at on notification_tokens;")
    op.drop_table("notification_tokens")
