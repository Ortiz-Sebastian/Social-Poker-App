"""Add game format details to rooms

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-02-22

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'c3d4e5f6a7b8'
down_revision: Union[str, None] = 'b2c3d4e5f6a7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    game_type = sa.Enum(
        'texas_holdem', 'pot_limit_omaha', 'omaha_hi_lo', 'stud', 'mixed', 'other',
        name='gametype',
    )
    game_type.create(op.get_bind())

    game_format = sa.Enum('cash', 'tournament', name='gameformat')
    game_format.create(op.get_bind())

    op.add_column('rooms', sa.Column(
        'game_type',
        sa.Enum('texas_holdem', 'pot_limit_omaha', 'omaha_hi_lo', 'stud', 'mixed', 'other', name='gametype'),
        nullable=True,
    ))
    op.add_column('rooms', sa.Column(
        'game_format',
        sa.Enum('cash', 'tournament', name='gameformat'),
        nullable=True,
    ))
    op.add_column('rooms', sa.Column('blind_structure', sa.String(), nullable=True))
    op.add_column('rooms', sa.Column('house_rules', sa.Text(), nullable=True))

    op.create_index(op.f('ix_rooms_game_type'), 'rooms', ['game_type'], unique=False)
    op.create_index(op.f('ix_rooms_game_format'), 'rooms', ['game_format'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_rooms_game_format'), table_name='rooms')
    op.drop_index(op.f('ix_rooms_game_type'), table_name='rooms')

    op.drop_column('rooms', 'house_rules')
    op.drop_column('rooms', 'blind_structure')
    op.drop_column('rooms', 'game_format')
    op.drop_column('rooms', 'game_type')

    sa.Enum(name='gameformat').drop(op.get_bind())
    sa.Enum(name='gametype').drop(op.get_bind())
