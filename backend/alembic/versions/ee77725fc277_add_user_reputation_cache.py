"""Add user reputation cache fields

Revision ID: ee77725fc277
Revises: 014846bde234
Create Date: 2026-01-25 13:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ee77725fc277'
down_revision: Union[str, None] = '014846bde234'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add cached reputation fields to users table
    # These are derived from the reviews table and can be recomputed at any time
    op.add_column('users', sa.Column('avg_rating', sa.Float(), nullable=False, server_default='0.0'))
    op.add_column('users', sa.Column('review_count', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('users', sa.Column('games_completed', sa.Integer(), nullable=False, server_default='0'))
    
    # Create indexes for sorting/filtering by reputation
    op.create_index('ix_users_avg_rating', 'users', ['avg_rating'], unique=False)
    op.create_index('ix_users_review_count', 'users', ['review_count'], unique=False)
    op.create_index('ix_users_games_completed', 'users', ['games_completed'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_users_games_completed', table_name='users')
    op.drop_index('ix_users_review_count', table_name='users')
    op.drop_index('ix_users_avg_rating', table_name='users')
    op.drop_column('users', 'games_completed')
    op.drop_column('users', 'review_count')
    op.drop_column('users', 'avg_rating')
