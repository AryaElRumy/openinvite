"""add guest invitation identity and quota

Revision ID: 7b80aca5cc50
Revises: 21e08758c9b3
Create Date: 2026-11-14 20:14:19.841599

"""

from typing import Sequence, Union

import sqlalchemy as sa
import sqlmodel

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "7b80aca5cc50"
down_revision: Union[str, Sequence[str], None] = "21e08758c9b3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        "guests",
        sa.Column("invitation_code", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
    )
    op.add_column(
        "guests",
        sa.Column("max_attendees", sa.Integer(), nullable=False, server_default="1"),
    )

    op.execute(
        "UPDATE guests "
        "SET invitation_code = md5(random()::text || clock_timestamp()::text || id)"
    )
    op.alter_column(
        "guests",
        "invitation_code",
        existing_type=sqlmodel.sql.sqltypes.AutoString(),
        nullable=False,
    )
    op.create_index(
        op.f("ix_guests_invitation_code"),
        "guests",
        ["invitation_code"],
        unique=True,
    )
    op.create_check_constraint(
        "ck_guests_max_attendees_positive",
        "guests",
        "max_attendees >= 1",
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint("ck_guests_max_attendees_positive", "guests", type_="check")
    op.drop_index(op.f("ix_guests_invitation_code"), table_name="guests")
    op.drop_column("guests", "max_attendees")
    op.drop_column("guests", "invitation_code")
