from typing import List, Dict, Any

from fastapi import HTTPException, status, Depends
from sqlalchemy.orm import Session
from sqlalchemy import select, insert, delete
from sqlalchemy.exc import IntegrityError

from app.db.database import db_dependency
from app.users.models import Role, Permission, role_permission_association
from app.users.roles.schemas import CreateRoleSchema, UpdateRoleSchema, RoleResponseSchema


class RoleService:
    def __init__(self, db: db_dependency):
        self.db = db

    def get_role_by_id(self, role_id: int) -> Role:
        role = self.db.query(Role).filter(Role.id == role_id).first()
        if not role:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Role not found"
            )
        return role

    def create_role(self, data: CreateRoleSchema) -> Role:
        existing_role = self.db.query(Role).filter(Role.name == data.name).first()
        if existing_role:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Role already exists"
            )
        
        new_role = Role(
            name=data.name,
            description=data.description
        )
        try:
            self.db.add(new_role)
            self.db.commit()
            self.db.refresh(new_role)
        except IntegrityError:
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Role creation failed due to database constraint"
            )
        return new_role

    def list_roles(self, skip: int = 0, limit: int = 100) -> Dict[str, Any]:
        total = self.db.query(Role).count()
        roles = self.db.query(Role).offset(skip).limit(limit).all()
        return {"total": total, "roles": roles}

    def update_role(self, role_id: int, data: UpdateRoleSchema) -> Role:
        role = self.get_role_by_id(role_id)
        if not role:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Role not found"
            )
        if role.built_in:
            if 'name' in data.model_dump(exclude_unset=True) and data.name != role.name:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cannot change name of a built-in role"
                )
        
        # Handle permission updates
        if data.permissions is not None:
            # Prevent removing built-in permissions from built-in roles
            if role.built_in:
                # Get current built-in permissions associated with this role
                current_built_in_permission_ids_stmt = select(role_permission_association.c.permission_id).where(
                    role_permission_association.c.role_id == role.id,
                    role_permission_association.c.built_in == True
                )
                current_built_in_permission_ids = {p for p, in self.db.execute(current_built_in_permission_ids_stmt).all()}
                
                new_permission_ids = set(data.permissions)
                if not current_built_in_permission_ids.issubset(new_permission_ids):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Cannot remove built-in permissions from a built-in role"
                    )

            # Remove existing permissions not in new list
            permissions_to_remove_stmt = delete(role_permission_association).where(
                role_permission_association.c.role_id == role.id,
                role_permission_association.c.permission_id.notin_(data.permissions)
            )
            self.db.execute(permissions_to_remove_stmt)

            # Add new permissions not currently associated
            current_permission_ids_stmt = select(role_permission_association.c.permission_id).where(role_permission_association.c.role_id == role.id)
            current_permission_ids = {p for p, in self.db.execute(current_permission_ids_stmt).all()}

            permissions_to_add = [
                {'role_id': role.id, 'permission_id': permission_id}
                for permission_id in data.permissions if permission_id not in current_permission_ids
            ]
            if permissions_to_add:
                self.db.execute(insert(role_permission_association).values(permissions_to_add))

        # Update other fields
        update_data = data.model_dump(exclude_unset=True, exclude={"permissions"})
        for field, value in update_data.items():
            setattr(role, field, value)
            
        try:
            self.db.commit()
            self.db.refresh(role)
        except IntegrityError:
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to update role due to database constraint"
            )
        return role

    def delete_role(self, role_id: int):
        role = self.get_role_by_id(role_id)
        if not role:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Role not found"
            )
        if role.built_in:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete a built-in role"
            )
        
        try:
            self.db.delete(role)
            self.db.commit()
        except IntegrityError:
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to delete role due to database constraint"
            )
        return {"detail": "Role deleted"}
