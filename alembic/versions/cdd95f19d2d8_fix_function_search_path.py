"""fix_function_search_path

Fix function search_path security warnings by adding explicit
search_path settings to all database functions.

Revision ID: cdd95f19d2d8
Revises: c6f55bc752ca
Create Date: 2025-10-29
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "cdd95f19d2d8"
down_revision = "c6f55bc752ca"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add search_path settings to all functions for security."""

    # 1. set_updated_at function
    op.execute("""
        CREATE OR REPLACE FUNCTION set_updated_at()
        RETURNS TRIGGER
        LANGUAGE plpgsql
        SET search_path = ''
        AS $$
        BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
        END;
        $$;
    """)

    # 2. current_uid function
    op.execute("""
        CREATE OR REPLACE FUNCTION current_uid()
        RETURNS UUID
        LANGUAGE SQL
        STABLE
        SET search_path = ''
        AS $$
          SELECT NULLIF(CURRENT_SETTING('app.current_uid', TRUE), '')::UUID;
        $$;
    """)

    # 3. is_service_role function
    op.execute("""
        CREATE OR REPLACE FUNCTION is_service_role()
        RETURNS BOOLEAN
        LANGUAGE SQL
        STABLE
        SET search_path = ''
        AS $$
          SELECT CURRENT_SETTING('app.current_role', TRUE) = 'service_role';
        $$;
    """)

    # 4. wilson_lower_bound function
    op.execute("""
        CREATE OR REPLACE FUNCTION wilson_lower_bound(likes INT, n INT, z NUMERIC DEFAULT 1.96)
        RETURNS NUMERIC
        LANGUAGE plpgsql
        IMMUTABLE
        SET search_path = ''
        AS $$
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
    """Remove search_path settings from functions."""

    # Revert to functions without search_path (original definitions)
    op.execute("""
        CREATE OR REPLACE FUNCTION set_updated_at()
        RETURNS TRIGGER LANGUAGE plpgsql AS $$
        BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
        END;
        $$;
    """)

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
