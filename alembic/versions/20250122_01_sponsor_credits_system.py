"""Add sponsor credits and slot reservation system

Revision ID: 20250122_01
Revises: 20250101_01
Create Date: 2025-01-22

Changes:
- Add credits column to sponsors table
- Remove plan_tier column from sponsors
- Create sponsor_slot_reservations table
- Create sponsor_credit_transactions table
- Add reservation_id to sponsor_themes
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '20250122_01'
down_revision: Union[str, None] = '20250101_01'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add credits column to sponsors table
    op.add_column(
        'sponsors',
        sa.Column('credits', sa.Integer(), nullable=False, server_default='0')
    )
    op.alter_column('sponsors', 'credits', server_default=None)

    # Remove plan_tier column and its check constraint
    op.drop_constraint('ck_sponsors_plan_tier', 'sponsors', type_='check')
    op.drop_column('sponsors', 'plan_tier')

    # Create sponsor_slot_reservations table
    op.create_table(
        'sponsor_slot_reservations',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('sponsor_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('category', sa.String(50), nullable=False),
        sa.Column('status', sa.String(20), nullable=False, server_default='reserved'),
        sa.Column('reserved_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['sponsor_id'], ['sponsors.id'], ondelete='CASCADE'),
        sa.UniqueConstraint('date', 'category', name='uq_sponsor_slot_date_category'),
    )
    op.create_index('ix_sponsor_slot_reservations_sponsor_id', 'sponsor_slot_reservations', ['sponsor_id'])
    op.create_index('ix_sponsor_slot_reservations_date', 'sponsor_slot_reservations', ['date'])
    op.create_index('ix_sponsor_slot_reservations_status', 'sponsor_slot_reservations', ['status'])

    # Add check constraint for status
    op.create_check_constraint(
        'ck_sponsor_slot_reservations_status',
        'sponsor_slot_reservations',
        "status IN ('reserved', 'used', 'cancelled')"
    )

    # Add check constraint for category
    op.create_check_constraint(
        'ck_sponsor_slot_reservations_category',
        'sponsor_slot_reservations',
        "category IN ('恋愛', '季節', '日常', 'ユーモア')"
    )

    # Create sponsor_credit_transactions table for tracking credit purchases
    op.create_table(
        'sponsor_credit_transactions',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('sponsor_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('amount', sa.Integer(), nullable=False),
        sa.Column('transaction_type', sa.String(20), nullable=False),
        sa.Column('stripe_payment_intent_id', sa.String(255), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['sponsor_id'], ['sponsors.id'], ondelete='CASCADE'),
    )
    op.create_index('ix_sponsor_credit_transactions_sponsor_id', 'sponsor_credit_transactions', ['sponsor_id'])
    op.create_index('ix_sponsor_credit_transactions_type', 'sponsor_credit_transactions', ['transaction_type'])

    # Add check constraint for transaction_type
    op.create_check_constraint(
        'ck_sponsor_credit_transactions_type',
        'sponsor_credit_transactions',
        "transaction_type IN ('purchase', 'use', 'refund', 'admin_adjustment')"
    )

    # Add reservation_id to sponsor_themes
    op.add_column(
        'sponsor_themes',
        sa.Column('reservation_id', postgresql.UUID(as_uuid=True), nullable=True)
    )
    op.create_foreign_key(
        'fk_sponsor_themes_reservation_id',
        'sponsor_themes',
        'sponsor_slot_reservations',
        ['reservation_id'],
        ['id'],
        ondelete='SET NULL'
    )
    op.create_index('ix_sponsor_themes_reservation_id', 'sponsor_themes', ['reservation_id'])

    # Create trigger for updated_at on sponsor_slot_reservations
    op.execute("""
        CREATE TRIGGER trg_sponsor_slot_reservations_updated_at
        BEFORE UPDATE ON sponsor_slot_reservations
        FOR EACH ROW EXECUTE FUNCTION app_public.set_updated_at();
    """)


def downgrade() -> None:
    # Drop trigger
    op.execute('DROP TRIGGER IF EXISTS trg_sponsor_slot_reservations_updated_at ON sponsor_slot_reservations')

    # Remove reservation_id from sponsor_themes
    op.drop_index('ix_sponsor_themes_reservation_id', 'sponsor_themes')
    op.drop_constraint('fk_sponsor_themes_reservation_id', 'sponsor_themes', type_='foreignkey')
    op.drop_column('sponsor_themes', 'reservation_id')

    # Drop sponsor_credit_transactions table
    op.drop_index('ix_sponsor_credit_transactions_type', 'sponsor_credit_transactions')
    op.drop_index('ix_sponsor_credit_transactions_sponsor_id', 'sponsor_credit_transactions')
    op.drop_table('sponsor_credit_transactions')

    # Drop sponsor_slot_reservations table
    op.drop_index('ix_sponsor_slot_reservations_status', 'sponsor_slot_reservations')
    op.drop_index('ix_sponsor_slot_reservations_date', 'sponsor_slot_reservations')
    op.drop_index('ix_sponsor_slot_reservations_sponsor_id', 'sponsor_slot_reservations')
    op.drop_table('sponsor_slot_reservations')

    # Restore plan_tier column
    op.add_column(
        'sponsors',
        sa.Column('plan_tier', sa.String(20), nullable=False, server_default='basic')
    )
    op.create_check_constraint(
        'ck_sponsors_plan_tier',
        'sponsors',
        "plan_tier IN ('basic', 'standard', 'premium')"
    )
    op.alter_column('sponsors', 'plan_tier', server_default=None)

    # Remove credits column
    op.drop_column('sponsors', 'credits')
