"""Add room_members table

Revision ID: cd1892a5fe83
Revises: 2368836b25e9
Create Date: 2026-01-25 12:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'cd1892a5fe83'
down_revision: Union[str, None] = '2368836b25e9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('room_members',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.Column('room_id', sa.Integer(), nullable=False),
    sa.Column('is_host', sa.Boolean(), nullable=False),
    sa.Column('status', sa.Enum('active', 'left', 'removed', name='roommemberstatus'), nullable=False),
    sa.Column('joined_at', sa.DateTime(), nullable=False),
    sa.Column('left_at', sa.DateTime(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.Column('updated_at', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['room_id'], ['rooms.id'], ),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('user_id', 'room_id', name='uq_room_member_user_room')
    )
    op.create_index(op.f('ix_room_members_id'), 'room_members', ['id'], unique=False)
    op.create_index('ix_room_members_user_id', 'room_members', ['user_id'], unique=False)
    op.create_index('ix_room_members_room_id', 'room_members', ['room_id'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_room_members_room_id', table_name='room_members')
    op.drop_index('ix_room_members_user_id', table_name='room_members')
    op.drop_index(op.f('ix_room_members_id'), table_name='room_members')
    op.drop_table('room_members')
