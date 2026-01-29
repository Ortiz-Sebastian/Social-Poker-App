"""Add queue_position to room_members

Revision ID: d5c11c193fbe
Revises: 7b086cda8257
Create Date: 2026-01-25

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd5c11c193fbe'
down_revision: Union[str, None] = '7b086cda8257'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add queue_position column for waitlist ordering
    op.add_column('room_members', sa.Column('queue_position', sa.Integer(), nullable=True))
    
    # Create index for efficient waitlist queries
    op.create_index(op.f('ix_room_members_queue_position'), 'room_members', ['queue_position'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_room_members_queue_position'), table_name='room_members')
    op.drop_column('room_members', 'queue_position')
