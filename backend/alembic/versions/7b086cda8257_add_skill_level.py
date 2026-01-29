"""Add skill_level to users and rooms

Revision ID: 7b086cda8257
Revises: 5c14301607ad
Create Date: 2026-01-25

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7b086cda8257'
down_revision: Union[str, None] = '5c14301607ad'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create the skill level enum type
    skill_level = sa.Enum('beginner', 'intermediate', 'advanced', 'expert', name='skilllevel')
    skill_level.create(op.get_bind())
    
    # Add skill_level column to users table
    op.add_column('users', sa.Column('skill_level', sa.Enum('beginner', 'intermediate', 'advanced', 'expert', name='skilllevel'), nullable=True))
    
    # Add skill_level column to rooms table
    op.add_column('rooms', sa.Column('skill_level', sa.Enum('beginner', 'intermediate', 'advanced', 'expert', name='skilllevel'), nullable=True))
    
    # Create indexes for filtering by skill level
    op.create_index(op.f('ix_users_skill_level'), 'users', ['skill_level'], unique=False)
    op.create_index(op.f('ix_rooms_skill_level'), 'rooms', ['skill_level'], unique=False)


def downgrade() -> None:
    # Drop indexes
    op.drop_index(op.f('ix_rooms_skill_level'), table_name='rooms')
    op.drop_index(op.f('ix_users_skill_level'), table_name='users')
    
    # Drop columns
    op.drop_column('rooms', 'skill_level')
    op.drop_column('users', 'skill_level')
    
    # Drop the enum type
    sa.Enum(name='skilllevel').drop(op.get_bind())
