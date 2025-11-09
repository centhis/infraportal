"""create admin user

Revision ID: 6fd1ecbf82fb
Revises: 9779956c4ae8
Create Date: 2025-10-04 23:22:30.908880

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

from passlib.context import CryptContext
from sqlalchemy.orm import Session
from app.core.config import settings


# revision identifiers, used by Alembic.
revision: str = '6fd1ecbf82fb'
down_revision: Union[str, Sequence[str], None] = '9779956c4ae8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


pwd_context = CryptContext(schemes=['argon2'], deprecated='auto')


def upgrade() -> None:
    """Upgrade schema."""
    bind = op.get_bind()
    session = Session(bind=bind)
    admin_user = session.scalar(
        sa.text("SELECT id FROM users WHERE login = :login"),
        {"login": settings.DEFAULT_ADMIN_USER}
    )
    if not admin_user:
        hashed_password = pwd_context.hash(settings.DEFAULT_ADMIN_PASSWORD)
        session.execute(
            sa.text("""
                INSERT INTO users (name, password, login, is_active, is_admin)
                VALUES (:name, :password, :login, true, true)        
            """),
            {
                "name": settings.DEFAULT_ADMIN_USER,
                "login": settings.DEFAULT_ADMIN_USER,
                "password": hashed_password
            }
        )
        session.commit()


def downgrade() -> None:
    """Downgrade schema."""
    bind = op.get_bind()
    session = Session(bind=bind)
    session.execute(
        sa.text("DELETE FROM users WHERE login = :u"),
        {"u": settings.DEFAULT_ADMIN_USER}
    )