"""Add unified sponsor_notifications table.

Revision ID: 20251128_01
Revises: 20251126_01
Create Date: 2025-11-28
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB

# revision identifiers, used by Alembic.
revision = "20251128_01"
down_revision = "20251126_01"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Create sponsor_notifications table and migrate data from sponsor_theme_notifications."""

    # Create unified sponsor_notifications table
    op.create_table(
        "sponsor_notifications",
        sa.Column("id", UUID, primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("sponsor_id", UUID, sa.ForeignKey("sponsors.id", ondelete="CASCADE"), nullable=False),
        sa.Column("type", sa.String(50), nullable=False),
        sa.Column("title", sa.Text, nullable=False),
        sa.Column("message", sa.Text, nullable=False),
        sa.Column("is_read", sa.Boolean, nullable=False, server_default=sa.text("false")),
        sa.Column("sponsor_theme_id", UUID, sa.ForeignKey("sponsor_themes.id", ondelete="CASCADE"), nullable=True),
        sa.Column("extra_data", JSONB, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.CheckConstraint(
            "type IN ('account_verified', 'account_rejected', 'theme_approved', 'theme_rejected', 'theme_published', 'credit_added', 'credit_used', 'system')",
            name="sponsor_notifications_type_check"
        ),
    )

    # Create indexes
    op.create_index(
        "idx_sponsor_notifications_sponsor",
        "sponsor_notifications",
        ["sponsor_id", "is_read", sa.text("created_at DESC")],
    )
    op.create_index(
        "idx_sponsor_notifications_theme",
        "sponsor_notifications",
        ["sponsor_theme_id"],
        postgresql_where=sa.text("sponsor_theme_id IS NOT NULL"),
    )

    # Enable RLS
    op.execute("ALTER TABLE sponsor_notifications ENABLE ROW LEVEL SECURITY")

    # RLS policies
    op.execute("""
        CREATE POLICY read_own_sponsor_notifications ON sponsor_notifications
        FOR SELECT USING (sponsor_id = auth.uid())
    """)

    op.execute("""
        CREATE POLICY update_own_sponsor_notifications ON sponsor_notifications
        FOR UPDATE USING (sponsor_id = auth.uid())
        WITH CHECK (sponsor_id = auth.uid())
    """)

    op.execute("""
        CREATE POLICY insert_sponsor_notifications ON sponsor_notifications
        FOR INSERT WITH CHECK (
            EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
        )
    """)

    # Migrate existing data from sponsor_theme_notifications
    op.execute("""
        INSERT INTO sponsor_notifications (id, sponsor_id, type, title, message, is_read, sponsor_theme_id, created_at)
        SELECT
            id,
            sponsor_id,
            CASE status
                WHEN 'approved' THEN 'theme_approved'
                WHEN 'rejected' THEN 'theme_rejected'
                WHEN 'published' THEN 'theme_published'
            END AS type,
            title,
            message,
            is_read,
            sponsor_theme_id,
            created_at
        FROM sponsor_theme_notifications
        ON CONFLICT (id) DO NOTHING
    """)

    # Create new trigger function for unified table
    op.execute("""
        CREATE OR REPLACE FUNCTION public.notify_sponsor_theme_status_change_v2()
        RETURNS trigger
        LANGUAGE plpgsql
        SET search_path = public
        AS $$
        DECLARE
            v_sponsor_id uuid;
            v_title text;
            v_message text;
            v_type text;
        BEGIN
            IF (TG_OP = 'UPDATE' AND OLD.status = NEW.status) THEN
                RETURN NEW;
            END IF;

            IF NEW.status NOT IN ('approved', 'rejected', 'published') THEN
                RETURN NEW;
            END IF;

            SELECT sc.sponsor_id INTO v_sponsor_id
            FROM sponsor_campaigns sc
            WHERE sc.id = NEW.campaign_id;

            IF v_sponsor_id IS NULL THEN
                RETURN NEW;
            END IF;

            CASE NEW.status
                WHEN 'approved' THEN
                    v_type := 'theme_approved';
                    v_title := 'お題が承認されました';
                    v_message := 'お題「' || NEW.text_575 || '」が審査を通過し、承認されました。配信日: ' || to_char(NEW.date, 'YYYY年MM月DD日');
                WHEN 'rejected' THEN
                    v_type := 'theme_rejected';
                    v_title := 'お題が却下されました';
                    IF NEW.rejection_reason IS NOT NULL AND NEW.rejection_reason != '' THEN
                        v_message := 'お題「' || NEW.text_575 || '」は審査の結果、却下されました。理由: ' || NEW.rejection_reason;
                    ELSE
                        v_message := 'お題「' || NEW.text_575 || '」は審査の結果、却下されました。';
                    END IF;
                WHEN 'published' THEN
                    v_type := 'theme_published';
                    v_title := 'お題が配信されました';
                    v_message := 'お題「' || NEW.text_575 || '」が配信されました。ユーザーの反応をインサイトページでご確認いただけます。';
            END CASE;

            INSERT INTO sponsor_notifications (
                sponsor_id,
                type,
                title,
                message,
                sponsor_theme_id
            ) VALUES (
                v_sponsor_id,
                v_type,
                v_title,
                v_message,
                NEW.id
            );

            RETURN NEW;
        END;
        $$
    """)

    # Drop old trigger and create new one
    op.execute("DROP TRIGGER IF EXISTS trg_sponsor_themes_status_notify ON sponsor_themes")
    op.execute("""
        CREATE TRIGGER trg_sponsor_themes_status_notify_v2
        AFTER INSERT OR UPDATE ON sponsor_themes
        FOR EACH ROW EXECUTE FUNCTION public.notify_sponsor_theme_status_change_v2()
    """)

    # Drop old table (data already migrated)
    op.execute("DROP TABLE IF EXISTS sponsor_theme_notifications CASCADE")


def downgrade() -> None:
    """Remove sponsor_notifications table and restore old trigger."""

    # Restore old trigger
    op.execute("DROP TRIGGER IF EXISTS trg_sponsor_themes_status_notify_v2 ON sponsor_themes")
    op.execute("""
        CREATE TRIGGER trg_sponsor_themes_status_notify
        AFTER INSERT OR UPDATE ON sponsor_themes
        FOR EACH ROW EXECUTE FUNCTION public.notify_sponsor_theme_status_change()
    """)

    # Drop new trigger function
    op.execute("DROP FUNCTION IF EXISTS public.notify_sponsor_theme_status_change_v2()")

    # Drop policies
    op.execute("DROP POLICY IF EXISTS read_own_sponsor_notifications ON sponsor_notifications")
    op.execute("DROP POLICY IF EXISTS update_own_sponsor_notifications ON sponsor_notifications")
    op.execute("DROP POLICY IF EXISTS insert_sponsor_notifications ON sponsor_notifications")

    # Drop table
    op.drop_table("sponsor_notifications")
