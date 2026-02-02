"""Add kicked and waitlisted to roommemberstatus enum

Revision ID: a1b2c3d4e5f6
Revises: d5c11c193fbe
Create Date: 2026-02-02

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = 'd5c11c193fbe'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add new enum values to roommemberstatus
    # PostgreSQL allows adding values to existing enums with ALTER TYPE
    op.execute("ALTER TYPE roommemberstatus ADD VALUE IF NOT EXISTS 'kicked'")
    op.execute("ALTER TYPE roommemberstatus ADD VALUE IF NOT EXISTS 'waitlisted'")


def downgrade() -> None:
    # PostgreSQL doesn't support removing enum values easily
    # The safest approach is to leave them in place
    # If you need to remove them, you'd need to:
    # 1. Create a new enum without those values
    # 2. Update the column to use the new enum
    # 3. Drop the old enum
    pass
