"""Add room status and finished_at

Revision ID: 5c14301607ad
Revises: 1b7bd6cdb05c
Create Date: 2026-01-25

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '5c14301607ad'
down_revision: Union[str, None] = '1b7bd6cdb05c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create the room status enum type
    room_status = sa.Enum('scheduled', 'active', 'finished', 'cancelled', name='roomstatus')
    room_status.create(op.get_bind())
    
    # Add status column with default 'scheduled'
    op.add_column('rooms', sa.Column('status', sa.Enum('scheduled', 'active', 'finished', 'cancelled', name='roomstatus'), nullable=False, server_default='scheduled'))
    
    # Add finished_at timestamp
    op.add_column('rooms', sa.Column('finished_at', sa.DateTime(), nullable=True))
    
    # Create index on status for filtering
    op.create_index(op.f('ix_rooms_status'), 'rooms', ['status'], unique=False)


def downgrade() -> None:
    # Drop index
    op.drop_index(op.f('ix_rooms_status'), table_name='rooms')
    
    # Drop columns
    op.drop_column('rooms', 'finished_at')
    op.drop_column('rooms', 'status')
    
    # Drop the enum type
    sa.Enum(name='roomstatus').drop(op.get_bind())
