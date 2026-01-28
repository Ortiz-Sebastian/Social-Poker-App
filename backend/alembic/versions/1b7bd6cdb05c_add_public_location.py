"""Add public_location to rooms

Revision ID: 1b7bd6cdb05c
Revises: ee77725fc277
Create Date: 2026-01-25 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import geoalchemy2


# revision identifiers, used by Alembic.
revision: str = '1b7bd6cdb05c'
down_revision: Union[str, None] = 'ee77725fc277'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add public_location column - approximate location shown to non-members
    op.add_column('rooms', sa.Column(
        'public_location',
        geoalchemy2.types.Geography(geometry_type='POINT', srid=4326, from_text='ST_GeogFromText', name='geography'),
        nullable=True
    ))
    
    # Create spatial index for public_location
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_rooms_public_location 
        ON rooms USING gist (public_location)
    """)


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS idx_rooms_public_location")
    op.drop_column('rooms', 'public_location')
