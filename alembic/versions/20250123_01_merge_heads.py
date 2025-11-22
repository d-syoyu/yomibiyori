"""Merge multiple migration heads

Revision ID: 20250123_01
Revises: 20250122_01, 20251115_02
Create Date: 2025-01-23

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '20250123_01'
down_revision: Union[str, None] = ('20250122_01', '20251115_02')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # This is a merge migration, no schema changes needed
    pass


def downgrade() -> None:
    # This is a merge migration, no schema changes needed
    pass
