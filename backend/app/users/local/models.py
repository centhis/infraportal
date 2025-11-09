from sqlalchemy import Column, Integer, String, DateTime, Boolean
from sqlalchemy.sql import func

from app.db.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    login = Column(String, unique=True, index=True)
    password = Column(String)
    name = Column(String, index=True)
    is_admin = Column(Boolean, default=False)
    is_active = Column(Boolean, default=False)
    is_ldap = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())