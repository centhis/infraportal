from sqlalchemy.orm import Session
from app.users.models import User
from app.core.config import settings
from app.core.security import hash_password

def init_data(db: Session):
    admin_user = db.query(User).filter(User.login == settings.DEFAULT_ADMIN_USER).first()
    if not admin_user:
        new_admin = User(
            login=settings.DEFAULT_ADMIN_USER,
            password=hash_password(settings.DEFAULT_ADMIN_PASSWORD),
            name=settings.DEFAULT_ADMIN_USER,
            is_admin=True,
            is_active=True
        )
        db.add(new_admin)
        db.commit()
