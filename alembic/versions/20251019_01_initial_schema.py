"""Initial schema: create all base tables (users, themes, works, likes, rankings, sponsors).

Revision ID: 20251019_01
Revises: None
Create Date: 2025-10-19
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "20251019_01"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create helper function for updated_at trigger
    op.execute("""
        CREATE OR REPLACE FUNCTION set_updated_at()
        RETURNS TRIGGER LANGUAGE plpgsql AS $$
        BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
        END;
        $$;
    """)

    # Create helper functions for RLS
    op.execute("""
        CREATE OR REPLACE FUNCTION current_uid()
        RETURNS UUID LANGUAGE SQL STABLE AS $$
          SELECT NULLIF(CURRENT_SETTING('app.current_uid', TRUE), '')::UUID;
        $$;
    """)

    op.execute("""
        CREATE OR REPLACE FUNCTION is_service_role()
        RETURNS BOOLEAN LANGUAGE SQL STABLE AS $$
          SELECT CURRENT_SETTING('app.current_role', TRUE) = 'service_role';
        $$;
    """)

    # Users table
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("handle", sa.String(length=255), nullable=False),
        sa.Column("display_name", sa.Text(), nullable=True),
        sa.Column("bio", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_unique_constraint("uq_users_handle", "users", ["handle"])

    op.execute("""
        CREATE TRIGGER trg_users_updated_at
        BEFORE UPDATE ON users
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    """)

    # Themes table
    op.create_table(
        "themes",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("category", sa.Text(), nullable=False, server_default="general"),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("sponsored", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.CheckConstraint("length(text) BETWEEN 3 AND 140", name="ck_themes_text_length"),
    )
    op.create_index("uq_themes_category_date", "themes", ["category", "date"], unique=True)

    # Works table
    op.create_table(
        "works",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("theme_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["theme_id"], ["themes.id"], ondelete="CASCADE"),
    )
    op.create_index("uq_works_user_theme", "works", ["user_id", "theme_id"], unique=True)
    op.create_index("idx_works_theme_created", "works", ["theme_id", "created_at"])

    op.execute("""
        CREATE TRIGGER trg_works_updated_at
        BEFORE UPDATE ON works
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    """)

    # Likes table
    op.create_table(
        "likes",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("work_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["work_id"], ["works.id"], ondelete="CASCADE"),
    )
    op.create_index("uq_likes_user_work", "likes", ["user_id", "work_id"], unique=True)
    op.create_index("idx_likes_work", "likes", ["work_id"])

    # Rankings table
    op.create_table(
        "rankings",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("theme_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("work_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("score", sa.Numeric(8, 5), nullable=False),
        sa.Column("rank", sa.Integer(), nullable=False),
        sa.Column("snapshot_time", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["theme_id"], ["themes.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["work_id"], ["works.id"], ondelete="CASCADE"),
    )
    op.create_index("idx_rankings_theme_score", "rankings", ["theme_id", "score"])
    op.create_index("idx_rankings_theme_rank", "rankings", ["theme_id", "rank"])

    # Sponsors table
    op.create_table(
        "sponsors",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("company_name", sa.Text(), nullable=False),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("category", sa.Text(), nullable=False, server_default="general"),
        sa.Column("budget", sa.Numeric(12, 2), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.CheckConstraint("length(text) BETWEEN 3 AND 140", name="ck_sponsors_text_length"),
    )

    # Enable RLS on all tables
    op.execute("ALTER TABLE users ENABLE ROW LEVEL SECURITY;")
    op.execute("ALTER TABLE themes ENABLE ROW LEVEL SECURITY;")
    op.execute("ALTER TABLE works ENABLE ROW LEVEL SECURITY;")
    op.execute("ALTER TABLE likes ENABLE ROW LEVEL SECURITY;")
    op.execute("ALTER TABLE rankings ENABLE ROW LEVEL SECURITY;")
    op.execute("ALTER TABLE sponsors ENABLE ROW LEVEL SECURITY;")

    # RLS Policies - Read access for all
    op.execute("CREATE POLICY read_users ON users FOR SELECT USING (TRUE);")
    op.execute("CREATE POLICY read_themes ON themes FOR SELECT USING (TRUE);")
    op.execute("CREATE POLICY read_works ON works FOR SELECT USING (TRUE);")
    op.execute("CREATE POLICY read_likes ON likes FOR SELECT USING (TRUE);")
    op.execute("CREATE POLICY read_rankings ON rankings FOR SELECT USING (TRUE);")
    op.execute("CREATE POLICY read_sponsors ON sponsors FOR SELECT USING (TRUE);")

    # RLS Policies - Write access for users (own data)
    op.execute("""
        CREATE POLICY write_own_user ON users
        FOR ALL
        USING (id = COALESCE(current_uid(), id))
        WITH CHECK (id = COALESCE(current_uid(), id));
    """)

    op.execute("""
        CREATE POLICY insert_own_work ON works
        FOR INSERT
        WITH CHECK (user_id = COALESCE(current_uid(), user_id));
    """)

    op.execute("""
        CREATE POLICY update_own_work ON works
        FOR UPDATE
        USING (user_id = COALESCE(current_uid(), user_id));
    """)

    op.execute("""
        CREATE POLICY delete_own_work ON works
        FOR DELETE
        USING (user_id = COALESCE(current_uid(), user_id));
    """)

    op.execute("""
        CREATE POLICY insert_own_like ON likes
        FOR INSERT
        WITH CHECK (user_id = COALESCE(current_uid(), user_id));
    """)

    op.execute("""
        CREATE POLICY delete_own_like ON likes
        FOR DELETE
        USING (user_id = COALESCE(current_uid(), user_id));
    """)

    # RLS Policies - Service role only for themes/sponsors/rankings
    op.execute("""
        CREATE POLICY write_service_themes ON themes
        FOR ALL
        USING (is_service_role())
        WITH CHECK (is_service_role());
    """)

    op.execute("""
        CREATE POLICY write_service_sponsors ON sponsors
        FOR ALL
        USING (is_service_role())
        WITH CHECK (is_service_role());
    """)

    op.execute("""
        CREATE POLICY write_service_rankings ON rankings
        FOR ALL
        USING (is_service_role())
        WITH CHECK (is_service_role());
    """)

    # Create view for works with metrics
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

    # Wilson lower bound function
    op.execute("""
        CREATE OR REPLACE FUNCTION wilson_lower_bound(likes INT, n INT, z NUMERIC DEFAULT 1.96)
        RETURNS NUMERIC LANGUAGE plpgsql IMMUTABLE AS $$
        DECLARE
          phat NUMERIC;
          denom NUMERIC;
        BEGIN
          IF n <= 0 THEN
            RETURN 0;
          END IF;
          phat := likes::NUMERIC / n;
          denom := 1 + (z*z)/n;
          RETURN ((phat + (z*z)/(2*n) - z * SQRT((phat*(1-phat) + (z*z)/(4*n))/n)) / denom);
        END;
        $$;
    """)


def downgrade() -> None:
    # Drop view and function
    op.execute("DROP VIEW IF EXISTS works_with_metrics;")
    op.execute("DROP FUNCTION IF EXISTS wilson_lower_bound(INT, INT, NUMERIC);")

    # Drop tables
    op.drop_table("sponsors")
    op.drop_table("rankings")
    op.drop_table("likes")
    op.drop_table("works")
    op.drop_table("themes")
    op.drop_table("users")

    # Drop helper functions
    op.execute("DROP FUNCTION IF EXISTS is_service_role();")
    op.execute("DROP FUNCTION IF EXISTS current_uid();")
    op.execute("DROP FUNCTION IF EXISTS set_updated_at();")
