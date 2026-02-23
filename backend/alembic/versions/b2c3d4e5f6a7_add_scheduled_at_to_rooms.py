"""Add scheduled_at to rooms

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-02-19

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'b2c3d4e5f6a7'
down_revision: Union[str, None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('rooms', sa.Column('scheduled_at', sa.DateTime(), nullable=True))
    op.create_index(op.f('ix_rooms_scheduled_at'), 'rooms', ['scheduled_at'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_rooms_scheduled_at'), table_name='rooms')
    op.drop_column('rooms', 'scheduled_at')
