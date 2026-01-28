"""Add reviews table

Revision ID: 014846bde234
Revises: cd1892a5fe83
Create Date: 2026-01-25 13:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '014846bde234'
down_revision: Union[str, None] = 'cd1892a5fe83'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('reviews',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('room_id', sa.Integer(), nullable=False),
    sa.Column('reviewer_id', sa.Integer(), nullable=False),
    sa.Column('target_user_id', sa.Integer(), nullable=False),
    sa.Column('rating', sa.Integer(), nullable=False),
    sa.Column('comment', sa.Text(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.Column('updated_at', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['reviewer_id'], ['users.id'], ),
    sa.ForeignKeyConstraint(['room_id'], ['rooms.id'], ),
    sa.ForeignKeyConstraint(['target_user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.CheckConstraint('rating >= 1 AND rating <= 5', name='check_rating_range'),
    sa.CheckConstraint('reviewer_id != target_user_id', name='check_no_self_review'),
    sa.UniqueConstraint('room_id', 'reviewer_id', 'target_user_id', name='uq_review_room_reviewer_target')
    )
    op.create_index(op.f('ix_reviews_id'), 'reviews', ['id'], unique=False)
    op.create_index('ix_reviews_room_id', 'reviews', ['room_id'], unique=False)
    op.create_index('ix_reviews_reviewer_id', 'reviews', ['reviewer_id'], unique=False)
    op.create_index('ix_reviews_target_user_id', 'reviews', ['target_user_id'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_reviews_target_user_id', table_name='reviews')
    op.drop_index('ix_reviews_reviewer_id', table_name='reviews')
    op.drop_index('ix_reviews_room_id', table_name='reviews')
    op.drop_index(op.f('ix_reviews_id'), table_name='reviews')
    op.drop_table('reviews')
