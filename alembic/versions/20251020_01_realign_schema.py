"""Realign schema with REQUIREMENTS.md (users, works, sponsors).

Revision ID: 20251020_01
Revises: None
Create Date: 2025-10-20
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = "20251020_01"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    connection = op.get_bind()

    # --- users: introduce name/email, retire handle/display_name/bio -----------------
    op.add_column("users", sa.Column("name", sa.String(length=80), nullable=True))
    op.add_column("users", sa.Column("email", sa.String(length=320), nullable=True))

    connection.execute(
        text(
            """
            update users
               set name = coalesce(display_name, handle, 'Anonymous Poet'),
                   email = coalesce(email, handle || '@placeholder.local')
            """
        )
    )

    connection.execute(
        text(
            """
            -- ensure generated placeholder emails are unique by appending random suffixes if needed
            with duplicates as (
                select email, row_number() over (partition by email order by id) as rn, id
                from users
                where email is not null
            )
            update users
               set email = email || '-' || id
            from duplicates d
            where users.id = d.id and d.rn > 1
            """
        )
    )

    op.alter_column("users", "name", existing_type=sa.String(length=80), nullable=False)
    op.alter_column("users", "email", existing_type=sa.String(length=320), nullable=False)

    op.create_unique_constraint("uq_users_email", "users", ["email"])

    op.drop_column("users", "bio")
    op.drop_column("users", "display_name")
    op.drop_column("users", "handle")

    # --- works: enforce 40 character maximum ----------------------------------------
    result = connection.execute(text("select id, length(text) from works where length(text) > 40"))
    offending = result.fetchall()
    if offending:
        raise RuntimeError(
            "works.text contains entries longer than 40 characters. "
            "Please shorten them manually before applying this migration. "
            f"Offending IDs: {[row[0] for row in offending]}"
        )

    op.alter_column("works", "text", type_=sa.String(length=40), existing_type=sa.TEXT(), existing_nullable=False)
    op.create_check_constraint("ck_works_text_min_length", "works", "char_length(text) >= 1")

    # --- sponsors: add targeting columns --------------------------------------------
    op.add_column(
        "sponsors",
        sa.Column("target_regions", sa.ARRAY(sa.Text()), nullable=False, server_default="{}"),
    )
    op.add_column(
        "sponsors",
        sa.Column("target_age_min", sa.SmallInteger(), nullable=True),
    )
    op.add_column(
        "sponsors",
        sa.Column("target_age_max", sa.SmallInteger(), nullable=True),
    )

    op.create_check_constraint(
        "ck_sponsors_age_bounds",
        "sponsors",
        "(target_age_min is null or target_age_min between 0 and 120)"
        " AND (target_age_max is null or (target_age_max between 0 and 120"
        " AND (target_age_min is null or target_age_max >= target_age_min)))",
    )

    op.alter_column("sponsors", "target_regions", server_default=None)


def downgrade() -> None:
    # sponsors
    op.drop_constraint("ck_sponsors_age_bounds", "sponsors", type_="check")
    op.drop_column("sponsors", "target_age_max")
    op.drop_column("sponsors", "target_age_min")
    op.drop_column("sponsors", "target_regions")

    # works
    op.drop_constraint("ck_works_text_min_length", "works", type_="check")
    op.alter_column("works", "text", type_=sa.TEXT(), existing_type=sa.String(length=40), nullable=False)

    # users
    op.add_column("users", sa.Column("handle", sa.String(length=255), nullable=False))
    op.add_column("users", sa.Column("display_name", sa.Text(), nullable=True))
    op.add_column("users", sa.Column("bio", sa.Text(), nullable=True))

    op.execute(text("update users set handle = split_part(email, '@', 1) where handle is null"))
    op.execute(text("update users set display_name = name where display_name is null"))

    op.drop_constraint("uq_users_email", "users", type_="unique")

    op.drop_column("users", "email")
    op.drop_column("users", "name")
