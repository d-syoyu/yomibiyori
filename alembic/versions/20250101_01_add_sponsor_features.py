"""Add sponsor features (role, campaigns, sponsor_themes).

Revision ID: 20250101_01
Revises: 20251020_01
Create Date: 2025-01-01
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy import text
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "20250101_01"
down_revision = "cdd95f19d2d8"
branch_labels = None
depends_on = None


def upgrade() -> None:
    connection = op.get_bind()

    # ===== 1. Add role column to users table =====
    op.add_column(
        "users",
        sa.Column(
            "role",
            sa.String(20),
            nullable=False,
            server_default="user",
            comment="User role: user | sponsor | admin",
        ),
    )
    op.create_check_constraint(
        "ck_users_role",
        "users",
        "role IN ('user', 'sponsor', 'admin')",
    )
    op.create_index("idx_users_role", "users", ["role"])
    op.alter_column("users", "role", server_default=None)

    # ===== 2. Extend sponsors table =====
    # sponsors テーブルを既存のものから拡張
    # 既存: id, company_name, text, category, target_regions, target_age_min, target_age_max, budget, created_at

    # contact_email を追加
    op.add_column(
        "sponsors",
        sa.Column("contact_email", sa.String(320), nullable=True),
    )

    # official_url を追加
    op.add_column(
        "sponsors",
        sa.Column("official_url", sa.Text(), nullable=True),
    )

    # logo_url を追加
    op.add_column(
        "sponsors",
        sa.Column("logo_url", sa.Text(), nullable=True),
    )

    # plan_tier を追加（basic, standard, premium）
    op.add_column(
        "sponsors",
        sa.Column(
            "plan_tier",
            sa.String(20),
            nullable=False,
            server_default="basic",
            comment="Pricing tier: basic | standard | premium",
        ),
    )
    op.create_check_constraint(
        "ck_sponsors_plan_tier",
        "sponsors",
        "plan_tier IN ('basic', 'standard', 'premium')",
    )
    op.alter_column("sponsors", "plan_tier", server_default=None)

    # verified フラグを追加（KYC承認済みかどうか）
    op.add_column(
        "sponsors",
        sa.Column("verified", sa.Boolean(), nullable=False, server_default="false"),
    )
    op.alter_column("sponsors", "verified", server_default=None)

    # updated_at を追加
    op.add_column(
        "sponsors",
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )

    # updated_at 自動更新トリガーを作成
    connection.execute(
        text(
            """
            CREATE TRIGGER trg_sponsors_updated_at
            BEFORE UPDATE ON sponsors
            FOR EACH ROW EXECUTE FUNCTION set_updated_at()
            """
        )
    )

    # 既存カラムの修正
    # company_name を必須にする（既存データがある場合は注意）
    connection.execute(
        text("UPDATE sponsors SET company_name = 'Unknown Sponsor' WHERE company_name IS NULL OR company_name = ''")
    )
    op.alter_column("sponsors", "company_name", nullable=False)

    # text と category は sponsor_themes テーブルに移動するため、後で削除する予定
    # 今は残しておく（既存データ保護のため）

    # ===== 3. Create sponsor_campaigns table =====
    op.create_table(
        "sponsor_campaigns",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("sponsor_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("sponsors.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(200), nullable=False, comment="Campaign name"),
        sa.Column(
            "status",
            sa.String(20),
            nullable=False,
            server_default="draft",
            comment="Status: draft | active | paused | completed | cancelled",
        ),
        sa.Column("budget", sa.Numeric(12, 2), nullable=True, comment="Campaign budget (JPY)"),
        sa.Column("start_date", sa.Date(), nullable=True, comment="Campaign start date"),
        sa.Column("end_date", sa.Date(), nullable=True, comment="Campaign end date"),
        sa.Column(
            "targeting",
            postgresql.JSONB(),
            nullable=False,
            server_default="{}",
            comment="Targeting criteria: {region: [], age_band: [], os: []}",
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_check_constraint(
        "ck_sponsor_campaigns_status",
        "sponsor_campaigns",
        "status IN ('draft', 'active', 'paused', 'completed', 'cancelled')",
    )
    op.create_check_constraint(
        "ck_sponsor_campaigns_dates",
        "sponsor_campaigns",
        "end_date IS NULL OR start_date IS NULL OR end_date >= start_date",
    )
    op.create_index("idx_sponsor_campaigns_sponsor_id", "sponsor_campaigns", ["sponsor_id"])
    op.create_index("idx_sponsor_campaigns_status", "sponsor_campaigns", ["status"])

    # updated_at 自動更新トリガー
    connection.execute(
        text(
            """
            CREATE TRIGGER trg_sponsor_campaigns_updated_at
            BEFORE UPDATE ON sponsor_campaigns
            FOR EACH ROW EXECUTE FUNCTION set_updated_at()
            """
        )
    )

    # コメント
    op.execute("COMMENT ON TABLE sponsor_campaigns IS 'Sponsor advertising campaigns'")

    # ===== 4. Create sponsor_themes table =====
    op.create_table(
        "sponsor_themes",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("campaign_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("sponsor_campaigns.id", ondelete="CASCADE"), nullable=False),
        sa.Column("date", sa.Date(), nullable=False, comment="Scheduled theme date (JST)"),
        sa.Column("category", sa.String(50), nullable=False, comment="Theme category"),
        sa.Column("text_575", sa.String(140), nullable=False, comment="Upper verse (5-7-5)"),
        sa.Column("priority", sa.Integer(), nullable=False, server_default="0", comment="Slot priority (higher = preferred)"),
        sa.Column(
            "status",
            sa.String(20),
            nullable=False,
            server_default="pending",
            comment="Status: pending | approved | rejected | published",
        ),
        sa.Column("rejection_reason", sa.Text(), nullable=True, comment="Reason for rejection"),
        sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("approved_by", postgresql.UUID(as_uuid=True), nullable=True, comment="Admin user ID who approved"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_check_constraint(
        "ck_sponsor_themes_status",
        "sponsor_themes",
        "status IN ('pending', 'approved', 'rejected', 'published')",
    )
    op.create_check_constraint(
        "ck_sponsor_themes_text_length",
        "sponsor_themes",
        "char_length(text_575) >= 3 AND char_length(text_575) <= 140",
    )
    op.create_index("idx_sponsor_themes_campaign_id", "sponsor_themes", ["campaign_id"])
    op.create_index("idx_sponsor_themes_date_category", "sponsor_themes", ["date", "category"])
    op.create_index("idx_sponsor_themes_status", "sponsor_themes", ["status"])
    op.create_unique_constraint(
        "uq_sponsor_themes_date_category_campaign",
        "sponsor_themes",
        ["campaign_id", "date", "category"],
    )

    # updated_at 自動更新トリガー
    connection.execute(
        text(
            """
            CREATE TRIGGER trg_sponsor_themes_updated_at
            BEFORE UPDATE ON sponsor_themes
            FOR EACH ROW EXECUTE FUNCTION set_updated_at()
            """
        )
    )

    # コメント
    op.execute("COMMENT ON TABLE sponsor_themes IS 'Sponsor-submitted themes (upper verses) pending approval'")

    # ===== 5. Update themes table to support sponsors =====
    # sponsor_theme_id を追加（承認されたスポンサーお題へのリンク）
    op.add_column(
        "themes",
        sa.Column(
            "sponsor_theme_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("sponsor_themes.id", ondelete="SET NULL"),
            nullable=True,
            comment="Reference to approved sponsor theme",
        ),
    )
    op.create_index("idx_themes_sponsor_theme_id", "themes", ["sponsor_theme_id"])

    # sponsor_company_name を追加（表示用）
    op.add_column(
        "themes",
        sa.Column("sponsor_company_name", sa.String(200), nullable=True, comment="Sponsor company name for display"),
    )

    # ===== 6. Update RLS policies for new tables =====

    # sponsor_campaigns: sponsorロールは自分のキャンペーンのみCRUD可能、adminは全て、userは読み取りのみ
    connection.execute(text("ALTER TABLE sponsor_campaigns ENABLE ROW LEVEL SECURITY"))

    # 読み取り: 全員可能（透明性のため）
    connection.execute(
        text(
            """
            CREATE POLICY read_sponsor_campaigns ON sponsor_campaigns
            FOR SELECT USING (true)
            """
        )
    )

    # 作成: sponsorロールのみ
    connection.execute(
        text(
            """
            CREATE POLICY insert_own_campaign ON sponsor_campaigns
            FOR INSERT
            WITH CHECK (
                EXISTS (SELECT 1 FROM users WHERE id = current_setting('request.jwt.claim.sub', true)::uuid AND role = 'sponsor')
                OR current_setting('request.jwt.claim.role', true) = 'service_role'
            )
            """
        )
    )

    # 更新: 自分のキャンペーンまたはadmin
    connection.execute(
        text(
            """
            CREATE POLICY update_own_campaign ON sponsor_campaigns
            FOR UPDATE
            USING (
                sponsor_id = current_setting('request.jwt.claim.sub', true)::uuid
                OR EXISTS (SELECT 1 FROM users WHERE id = current_setting('request.jwt.claim.sub', true)::uuid AND role = 'admin')
                OR current_setting('request.jwt.claim.role', true) = 'service_role'
            )
            WITH CHECK (
                sponsor_id = current_setting('request.jwt.claim.sub', true)::uuid
                OR EXISTS (SELECT 1 FROM users WHERE id = current_setting('request.jwt.claim.sub', true)::uuid AND role = 'admin')
                OR current_setting('request.jwt.claim.role', true) = 'service_role'
            )
            """
        )
    )

    # 削除: 自分のキャンペーンまたはadmin
    connection.execute(
        text(
            """
            CREATE POLICY delete_own_campaign ON sponsor_campaigns
            FOR DELETE
            USING (
                sponsor_id = current_setting('request.jwt.claim.sub', true)::uuid
                OR EXISTS (SELECT 1 FROM users WHERE id = current_setting('request.jwt.claim.sub', true)::uuid AND role = 'admin')
                OR current_setting('request.jwt.claim.role', true) = 'service_role'
            )
            """
        )
    )

    # sponsor_themes: sponsorは自分のキャンペーンのお題のみCRUD、adminは全て
    connection.execute(text("ALTER TABLE sponsor_themes ENABLE ROW LEVEL SECURITY"))

    # 読み取り: 全員可能
    connection.execute(
        text(
            """
            CREATE POLICY read_sponsor_themes ON sponsor_themes
            FOR SELECT USING (true)
            """
        )
    )

    # 作成: sponsorロールのみ
    connection.execute(
        text(
            """
            CREATE POLICY insert_own_sponsor_theme ON sponsor_themes
            FOR INSERT
            WITH CHECK (
                campaign_id IN (
                    SELECT id FROM sponsor_campaigns WHERE sponsor_id = current_setting('request.jwt.claim.sub', true)::uuid
                )
                OR EXISTS (SELECT 1 FROM users WHERE id = current_setting('request.jwt.claim.sub', true)::uuid AND role = 'admin')
                OR current_setting('request.jwt.claim.role', true) = 'service_role'
            )
            """
        )
    )

    # 更新: 自分のお題またはadmin（審査のため）
    connection.execute(
        text(
            """
            CREATE POLICY update_own_sponsor_theme ON sponsor_themes
            FOR UPDATE
            USING (
                campaign_id IN (
                    SELECT id FROM sponsor_campaigns WHERE sponsor_id = current_setting('request.jwt.claim.sub', true)::uuid
                )
                OR EXISTS (SELECT 1 FROM users WHERE id = current_setting('request.jwt.claim.sub', true)::uuid AND role = 'admin')
                OR current_setting('request.jwt.claim.role', true) = 'service_role'
            )
            WITH CHECK (
                campaign_id IN (
                    SELECT id FROM sponsor_campaigns WHERE sponsor_id = current_setting('request.jwt.claim.sub', true)::uuid
                )
                OR EXISTS (SELECT 1 FROM users WHERE id = current_setting('request.jwt.claim.sub', true)::uuid AND role = 'admin')
                OR current_setting('request.jwt.claim.role', true) = 'service_role'
            )
            """
        )
    )

    # 削除: 自分のお題またはadmin
    connection.execute(
        text(
            """
            CREATE POLICY delete_own_sponsor_theme ON sponsor_themes
            FOR DELETE
            USING (
                campaign_id IN (
                    SELECT id FROM sponsor_campaigns WHERE sponsor_id = current_setting('request.jwt.claim.sub', true)::uuid
                )
                OR EXISTS (SELECT 1 FROM users WHERE id = current_setting('request.jwt.claim.sub', true)::uuid AND role = 'admin')
                OR current_setting('request.jwt.claim.role', true) = 'service_role'
            )
            """
        )
    )

    # sponsors テーブルの RLS を更新（既存のポリシーを考慮）
    # 既存の read_sponsors ポリシーがあるため、書き込みポリシーのみ追加
    connection.execute(
        text(
            """
            CREATE POLICY IF NOT EXISTS update_own_sponsor ON sponsors
            FOR UPDATE
            USING (
                id = current_setting('request.jwt.claim.sub', true)::uuid
                OR EXISTS (SELECT 1 FROM users WHERE id = current_setting('request.jwt.claim.sub', true)::uuid AND role = 'admin')
                OR current_setting('request.jwt.claim.role', true) = 'service_role'
            )
            WITH CHECK (
                id = current_setting('request.jwt.claim.sub', true)::uuid
                OR EXISTS (SELECT 1 FROM users WHERE id = current_setting('request.jwt.claim.sub', true)::uuid AND role = 'admin')
                OR current_setting('request.jwt.claim.role', true) = 'service_role'
            )
            """
        )
    )


def downgrade() -> None:
    connection = op.get_bind()

    # Drop RLS policies
    connection.execute(text("DROP POLICY IF EXISTS delete_own_sponsor_theme ON sponsor_themes"))
    connection.execute(text("DROP POLICY IF EXISTS update_own_sponsor_theme ON sponsor_themes"))
    connection.execute(text("DROP POLICY IF EXISTS insert_own_sponsor_theme ON sponsor_themes"))
    connection.execute(text("DROP POLICY IF EXISTS read_sponsor_themes ON sponsor_themes"))

    connection.execute(text("DROP POLICY IF EXISTS delete_own_campaign ON sponsor_campaigns"))
    connection.execute(text("DROP POLICY IF EXISTS update_own_campaign ON sponsor_campaigns"))
    connection.execute(text("DROP POLICY IF EXISTS insert_own_campaign ON sponsor_campaigns"))
    connection.execute(text("DROP POLICY IF EXISTS read_sponsor_campaigns ON sponsor_campaigns"))

    connection.execute(text("DROP POLICY IF EXISTS update_own_sponsor ON sponsors"))

    # Drop triggers
    connection.execute(text("DROP TRIGGER IF EXISTS trg_sponsor_themes_updated_at ON sponsor_themes"))
    connection.execute(text("DROP TRIGGER IF EXISTS trg_sponsor_campaigns_updated_at ON sponsor_campaigns"))
    connection.execute(text("DROP TRIGGER IF EXISTS trg_sponsors_updated_at ON sponsors"))

    # Drop themes extensions
    op.drop_index("idx_themes_sponsor_theme_id", "themes")
    op.drop_column("themes", "sponsor_company_name")
    op.drop_column("themes", "sponsor_theme_id")

    # Drop sponsor_themes table
    op.drop_table("sponsor_themes")

    # Drop sponsor_campaigns table
    op.drop_table("sponsor_campaigns")

    # Revert sponsors table
    op.drop_column("sponsors", "updated_at")
    op.drop_column("sponsors", "verified")
    op.drop_constraint("ck_sponsors_plan_tier", "sponsors", type_="check")
    op.drop_column("sponsors", "plan_tier")
    op.drop_column("sponsors", "logo_url")
    op.drop_column("sponsors", "official_url")
    op.drop_column("sponsors", "contact_email")

    # Revert users table
    op.drop_index("idx_users_role", "users")
    op.drop_constraint("ck_users_role", "users", type_="check")
    op.drop_column("users", "role")
