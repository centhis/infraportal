from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy import select
from sqlalchemy.orm import joinedload # Add joinedload import

from app.db.database import db_dependency
from app.users.models import User, Group, user_group_association # Add user_group_association
from app.users.local.schemas import CreateUserSchema, UpdateUserSchema, UserResponseSchema
from app.core.security import hash_password

class UserService:
    def __init__(self, db: db_dependency):
        self.db = db

    def get_user_by_id(self, user_id: int) -> UserResponseSchema:
        user = self.db.query(User).options(joinedload(User.groups)).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )

        built_in_group_ids = [
            g.group_id for g in self.db.query(user_group_association.c.group_id).filter(
                user_group_association.c.user_id == user_id,
                user_group_association.c.built_in
            ).all()
        ]

        user_response = UserResponseSchema.model_validate(user)
        user_response.built_in_group_ids = built_in_group_ids
        
        return user_response
    
    def get_user_by_login(self, login: str) -> User:
        user = self.db.query(User).filter(User.login == login).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        return user

    def create_user(self, data: CreateUserSchema) -> UserResponseSchema:
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
            self.db.refresh(new_user) # Refresh to load associations
        except Exception as e: # Change to catch general Exception
            print(f"DEBUG: Exception during create_user commit: {type(e).__name__} - {e}") # Add print for debugging
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"User creation failed: {type(e).__name__} - {e}" # Include exception detail
            )
        return self.get_user_by_id(new_user.id) # Use get_user_by_id to return full schema
    
    def list_users(self, skip: int = 0, limit: int = 100) -> dict:
        total = self.db.query(User).count()
        users = self.db.query(User).options(joinedload(User.groups)).offset(skip).limit(limit).all() # Add joinedload for groups
        
        # Enrich each user with built_in group IDs
        enriched_users = []
        for user in users:
            built_in_group_ids = [
                g.group_id for g in self.db.query(user_group_association.c.group_id).filter(
                    user_group_association.c.user_id == user.id,
                    user_group_association.c.built_in
                ).all()
            ]
            
            user_response = UserResponseSchema.model_validate(user)
            user_response.built_in_group_ids = built_in_group_ids
            enriched_users.append(user_response)
        
        return {"total": total, "users": enriched_users}
    
    def update_user(self, user_id: int, data: UpdateUserSchema) -> UserResponseSchema:
        user_orm = self.db.query(User).filter(User.id == user_id).first() # Fetch ORM object
        if not user_orm:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        update_data = data.model_dump(exclude_unset=True)

        if user_orm.type == "built_in":
            forbidden_fields = ['login', 'name', 'is_active', 'type']
            for field in forbidden_fields:
                if field in update_data and update_data[field] != getattr(user_orm, field):
                    # Special check for 'type' as it can't be changed at all for built-in
                    if field == 'type' and update_data[field] != 'built_in':
                         raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail="Cannot change type of a built-in user"
                        )
                    elif field != 'type':
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"Cannot change {field} of a built-in user"
                        )
        
        # Get current built-in group associations BEFORE updating
        current_built_in_group_ids = {g.group_id for g in self.db.query(user_group_association.c.group_id).filter(
            user_group_association.c.user_id == user_id,
            user_group_association.c.built_in
        ).all()}

        if 'group_ids' in update_data:
            group_ids = update_data.pop('group_ids')
            if group_ids is not None:
                # Prevent removing built-in groups from built-in users
                if user_orm.type == "built_in":
                    new_group_ids = set(group_ids)
                    if not current_built_in_group_ids.issubset(new_group_ids):
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail="Cannot remove built-in groups from a built-in user"
                        )

                if not group_ids:
                    user_orm.groups = []
                else:
                    groups = self.db.execute(select(Group).where(Group.id.in_(group_ids))).scalars().all()
                    if len(groups) != len(group_ids):
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail="One or more group IDs are invalid."
                        )
                    user_orm.groups = groups

        for field, value in update_data.items():
            if field == "password" and value is not None:
                setattr(user_orm, field, hash_password(value))
            else:
                setattr(user_orm, field, value)
        try:
            self.db.commit()
            self.db.refresh(user_orm)
        except IntegrityError as e: # Catch IntegrityError specifically
            self.db.rollback()
            # Check for unique constraint violation on login
            if "ix_users_login" in str(e.orig): # e.orig is the original DBAPI error
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="User with this login already exists"
                )
            raise HTTPException( # Re-raise for other integrity errors
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Database error during user update: {e}"
            )
        except Exception as e: # Catch any other unexpected exceptions
            # Removed exc_info=True as it's not valid for print()
            print(f"DEBUG: Exception during update_user commit: {type(e).__name__} - {e}") 
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to update user: {type(e).__name__} - {e}"
            )
        return self.get_user_by_id(user_orm.id)
        
    def delete_user(self, user_id: int):
        user_orm = self.db.query(User).filter(User.id == user_id).first() # Fetch ORM object
        if not user_orm:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        if user_orm.type == "built_in":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete a built-in user"
            )
        try:
            self.db.delete(user_orm) # Delete ORM object
            self.db.commit()
        except IntegrityError:
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to delete user due to database constraint"
            )
        return {"detail": "User deleted"}