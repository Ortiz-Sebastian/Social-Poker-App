"""Add OAuth fields to users

Revision ID: 2368836b25e9
Revises: 09610e4e4f79
Create Date: 2026-01-25 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2368836b25e9'
down_revision: Union[str, None] = '09610e4e4f79'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Make hashed_password nullable for OAuth users
    op.alter_column('users', 'hashed_password',
                    existing_type=sa.String(),
                    nullable=True)
    
    # Add provider and provider_id columns
    op.add_column('users', sa.Column('provider', sa.String(), nullable=True))
    op.add_column('users', sa.Column('provider_id', sa.String(), nullable=True))
    
    # Create index on provider and provider_id for faster lookups
    op.create_index('ix_users_provider_provider_id', 'users', ['provider', 'provider_id'], unique=False)


def downgrade() -> None:
    # Drop index
    op.drop_index('ix_users_provider_provider_id', table_name='users')
    
    # Remove columns
    op.drop_column('users', 'provider_id')
    op.drop_column('users', 'provider')
    
    # Make hashed_password non-nullable again
    op.alter_column('users', 'hashed_password',
                    existing_type=sa.String(),
                    nullable=False)
