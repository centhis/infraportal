from typing import List, Dict, Any

from fastapi import HTTPException, status, Depends
from sqlalchemy.orm import Session
from sqlalchemy import select, insert, delete
from sqlalchemy.exc import IntegrityError

from app.db.database import db_dependency
from app.users.models import Group, Role, group_role_association
from app.users.groups.schemas import CreateGroupSchema, UpdateGroupSchema, GroupResponseSchema


class GroupService:
    def __init__(self, db: db_dependency):
        self.db = db

    def get_group_by_id(self, group_id: int) -> Group:
        group = self.db.query(Group).filter(Group.id == group_id).first()
        if not group:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Group not found"
            )
        return group

    def create_group(self, data: CreateGroupSchema) -> Group:
        existing_group = self.db.query(Group).filter(Group.name == data.name).first()
        if existing_group:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Group already exists"
            )
        
        new_group = Group(
            name=data.name,
            description=data.description
        )
        try:
            self.db.add(new_group)
            self.db.commit()
            self.db.refresh(new_group)
        except IntegrityError:
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Group creation failed due to database constraint"
            )
        return new_group

    def list_groups(self, skip: int = 0, limit: int = 100) -> Dict[str, Any]:
        total = self.db.query(Group).count()
        groups = self.db.query(Group).offset(skip).limit(limit).all()
        return {"total": total, "groups": groups}

    def update_group(self, group_id: int, data: UpdateGroupSchema) -> Group:
        group = self.get_group_by_id(group_id)
        if not group:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Group not found"
            )
        if group.built_in:
            if 'name' in data.model_dump(exclude_unset=True) and data.name != group.name:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cannot change name of a built-in group"
                )
        
        # Handle role updates
        if data.roles is not None:
            # Prevent removing built-in roles from built-in groups
            if group.built_in:
                # Get current built-in roles associated with this group
                current_built_in_role_ids_stmt = select(group_role_association.c.role_id).where(
                    group_role_association.c.group_id == group.id,
                    group_role_association.c.built_in == True
                )
                current_built_in_role_ids = {r for r, in self.db.execute(current_built_in_role_ids_stmt).all()}
                
                new_role_ids = set(data.roles)
                if not current_built_in_role_ids.issubset(new_role_ids):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Cannot remove built-in roles from a built-in group"
                    )

            # Remove existing roles not in new list
            roles_to_remove_stmt = delete(group_role_association).where(
                group_role_association.c.group_id == group.id,
                group_role_association.c.role_id.notin_(data.roles)
            )
            self.db.execute(roles_to_remove_stmt)

            # Add new roles not currently associated
            current_role_ids_stmt = select(group_role_association.c.role_id).where(group_role_association.c.group_id == group.id)
            current_role_ids = {r for r, in self.db.execute(current_role_ids_stmt).all()}

            roles_to_add = [
                {'group_id': group.id, 'role_id': role_id}
                for role_id in data.roles if role_id not in current_role_ids
            ]
            if roles_to_add:
                self.db.execute(insert(group_role_association).values(roles_to_add))

        # Update other fields
        update_data = data.model_dump(exclude_unset=True, exclude={"roles"})
        for field, value in update_data.items():
            setattr(group, field, value)
            
        try:
            self.db.commit()
            self.db.refresh(group)
        except IntegrityError:
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to update group due to database constraint"
            )
        return group

    def delete_group(self, group_id: int):
        group = self.get_group_by_id(group_id)
        if not group:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Group not found"
            )
        if group.built_in:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete a built-in group"
            )
        
        try:
            self.db.delete(group)
            self.db.commit()
        except IntegrityError:
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to delete group due to database constraint"
            )
        return {"detail": "Group deleted"}
