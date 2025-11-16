from fastapi import HTTPException, status, Depends
from sqlalchemy.exc import IntegrityError
from typing import List

from app.db.database import db_dependency
from app.users.models import User
from app.users.local.schemas import CreateUserSchema, UpdateUserSchema, UserResponseSchema
from app.core.security import hash_password

class UserService:
    def __init__(self, db: db_dependency):
        self.db = db

    def get_user_by_id(self, user_id: int) -> User:
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        return user
    
    def get_user_by_login(self, login: str) -> User:
        user = self.db.query(User).filter(User.login == login).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        return user

    def create_user(self, data: CreateUserSchema) -> User:
        existing_user = self.db.query(User).filter(User.login == data.login).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User already exists"
            )
        new_user = User(
            login = data.login,
            password = hash_password(data.password),
            name = data.name,
            is_active = data.is_active,
            is_admin = data.is_admin,
            is_ldap = data.is_ldap
        )
        try:
            self.db.add(new_user)
            self.db.commit()
            self.db.refresh(new_user)
        except IntegrityError as e:
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User creation failed due to database constraint"
            )
        return UserResponseSchema.model_validate(new_user)
    
    def list_users(self, skip: int = 0, limit: int = 100) -> dict:
        total = self.db.query(User).count()
        users = self.db.query(User).offset(skip).limit(limit).all()
        return {"total": total, "users": users}
    
    def update_user(self, user_id: int, data: UpdateUserSchema) -> User:
        user = self.get_user_by_id(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        for field, value in data.model_dump(exclude_unset=True).items():
            if field == "password" and value is not None:
                setattr(user, field, hash_password(value))
            else:
                setattr(user, field, value)
        try:
            self.db.commit()
            self.db.refresh(user)
        except IntegrityError:
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to update user due to database constraint"
        )
        return UserResponseSchema.model_validate(user)
        
    def delete_user(self, user_id: int):
        user = self.get_user_by_id(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        try:
            self.db.delete(user)
            self.db.commit()
        except IntegrityError:
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to delete user due to database constraint"
            )
        return {"detail": "User deleted"}