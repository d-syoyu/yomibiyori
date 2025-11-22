"""allow rejected theme resubmission

Revision ID: 1e7e99b4f77e
Revises: 20250123_01
Create Date: 2025-11-22

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '1e7e99b4f77e'
down_revision: Union[str, None] = '20250123_01'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Drop existing unique constraint
    op.drop_constraint('uq_sponsor_themes_date_category_campaign', 'sponsor_themes', type_='unique')

    # Create partial unique index that only applies to non-rejected themes
    # This allows resubmission after rejection while maintaining uniqueness for active themes
    op.execute("""
        CREATE UNIQUE INDEX uq_sponsor_themes_date_category_campaign_active
        ON sponsor_themes (campaign_id, date, category)
        WHERE status NOT IN ('rejected');
    """)


def downgrade() -> None:
    # Drop partial unique index
    op.drop_index('uq_sponsor_themes_date_category_campaign_active', table_name='sponsor_themes')

    # Restore original unique constraint
    op.create_unique_constraint(
        'uq_sponsor_themes_date_category_campaign',
        'sponsor_themes',
        ['campaign_id', 'date', 'category']
    )
