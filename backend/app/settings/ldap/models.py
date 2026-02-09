from sqlalchemy import Boolean, Column, DateTime, Integer, String
from sqlalchemy.sql import func

from app.db.orm_base import Base


class LdapSetting(Base):
    __tablename__ = "ldap_settings"
    id = Column(Integer, primary_key=True, index=True)
    key = Column(String, unique=True, index=True, nullable=False)
    value = Column(String, nullable=True)  # Храним как строку, для пароля будет зашифровано
    type = Column(String, nullable=False)  # Поля 'string', 'integer', 'boolean', 'json', 'password'
    is_sensitive = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
