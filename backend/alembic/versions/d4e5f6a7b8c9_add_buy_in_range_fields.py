"""Add buy_in_min and buy_in_max to rooms

Revision ID: d4e5f6a7b8c9
Revises: c3d4e5f6a7b8
Create Date: 2026-02-22

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'd4e5f6a7b8c9'
down_revision: Union[str, None] = 'c3d4e5f6a7b8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('rooms', sa.Column('buy_in_min', sa.Integer(), nullable=True))
    op.add_column('rooms', sa.Column('buy_in_max', sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column('rooms', 'buy_in_max')
    op.drop_column('rooms', 'buy_in_min')
