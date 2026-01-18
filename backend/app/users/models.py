from sqlalchemy import Column, Integer, String, DateTime, Boolean, Table, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.orm_base import Base

# Association Tables
role_permission_association = Table(
    'role_permission_association', Base.metadata,
    Column('role_id', Integer, ForeignKey('roles.id')),
    Column('permission_id', Integer, ForeignKey('permissions.id')),
    Column('built_in', Boolean, default=False, nullable=False),
    Column('created_at', DateTime(timezone=True), server_default=func.now())
)

group_role_association = Table(
    'group_role_association', Base.metadata,
    Column('group_id', Integer, ForeignKey('groups.id')),
    Column('role_id', Integer, ForeignKey('roles.id')),
    Column('built_in', Boolean, default=False, nullable=False),
    Column('created_at', DateTime(timezone=True), server_default=func.now())
)

user_group_association = Table(
    'user_group_association', Base.metadata,
    Column('user_id', Integer, ForeignKey('users.id')),
    Column('group_id', Integer, ForeignKey('groups.id')),
    Column('built_in', Boolean, default=False, nullable=False),
    Column('created_at', DateTime(timezone=True), server_default=func.now())
)

# Models
class Permission(Base):
    __tablename__ = "permissions"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    description = Column(String)
    built_in = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    roles = relationship("Role", secondary=role_permission_association, back_populates="permissions")

class Role(Base):
    __tablename__ = "roles"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    description = Column(String)
    built_in = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    permissions = relationship("Permission", secondary=role_permission_association, back_populates="roles")
    groups = relationship("Group", secondary=group_role_association, back_populates="roles")

class Group(Base):
    __tablename__ = "groups"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    description = Column(String)
    built_in = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    roles = relationship("Role", secondary=group_role_association, back_populates="groups")
    users = relationship("User", secondary=user_group_association, back_populates="groups")

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    login = Column(String, unique=True, index=True)
    password = Column(String)
    name = Column(String, index=True)
    is_active = Column(Boolean, default=False)
    type = Column(String, default="local", nullable=False)
    ldap_id = Column(String, unique=True, index=True, nullable=True)
    ldap_dn = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    groups = relationship("Group", secondary=user_group_association, back_populates="users")
    sessions = relationship("UserSession", back_populates="user", cascade="all, delete-orphan")
