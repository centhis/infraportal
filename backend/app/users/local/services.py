from fastapi import HTTPException, status, Depends
from sqlalchemy.exc import IntegrityError
from typing import List
from sqlalchemy import select

from app.db.database import db_dependency
from app.users.models import User, Group
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
            type = data.type
        )

        if data.group_ids is not None:
            if not data.group_ids:
                new_user.groups = []
            else:
                groups = self.db.execute(select(Group).where(Group.id.in_(data.group_ids))).scalars().all()
                if len(groups) != len(data.group_ids):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="One or more group IDs are invalid."
                    )
                new_user.groups = groups

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
        
        update_data = data.model_dump(exclude_unset=True)

        if user.type == "built_in":
            forbidden_fields = ['login', 'name', 'is_active', 'type']
            for field in forbidden_fields:
                if field in update_data and update_data[field] != getattr(user, field):
                    # Special check for 'type' as it can't be changed at all for built-in
                    if field == 'type' and update_data[field] != 'built_in':
                         raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"Cannot change type of a built-in user"
                        )
                    elif field != 'type':
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"Cannot change {field} of a built-in user"
                        )
        
        if 'group_ids' in update_data:
            group_ids = update_data.pop('group_ids')
            if group_ids is not None:
                if not group_ids:
                    user.groups = []
                else:
                    groups = self.db.execute(select(Group).where(Group.id.in_(group_ids))).scalars().all()
                    if len(groups) != len(group_ids):
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail="One or more group IDs are invalid."
                        )
                    user.groups = groups

        for field, value in update_data.items():
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
        if user.type == "built_in":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete a built-in user"
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