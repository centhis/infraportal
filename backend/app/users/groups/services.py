from typing import Dict, Any

from fastapi import HTTPException, status
from sqlalchemy.orm import joinedload
from sqlalchemy import insert, delete
from sqlalchemy.exc import IntegrityError

from app.db.database import db_dependency
from app.users.models import Group, Role, group_role_association, user_group_association
from app.users.groups.schemas import CreateGroupSchema, UpdateGroupSchema, GroupResponseSchema


class GroupService:
    def __init__(self, db: db_dependency):
        self.db = db




    def get_group_by_id(self, group_id: int) -> GroupResponseSchema:
        group = self.db.query(Group).options(joinedload(Group.roles), joinedload(Group.users)).filter(Group.id == group_id).first()
        if not group:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Group not found"
            )

        built_in_role_ids = [
            r.role_id for r in self.db.query(group_role_association.c.role_id).filter(
                group_role_association.c.group_id == group_id,
                group_role_association.c.built_in
            ).all()
        ]
        built_in_user_ids = [
            u.user_id for u in self.db.query(user_group_association.c.user_id).filter(
                user_group_association.c.group_id == group_id,
                user_group_association.c.built_in
            ).all()
        ]
        
        group_response = GroupResponseSchema.model_validate(group)
        group_response.built_in_role_ids = built_in_role_ids
        group_response.built_in_user_ids = built_in_user_ids
        
        return group_response


    def create_group(self, data: CreateGroupSchema) -> GroupResponseSchema:
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

            # Associate roles with the new group
            if data.roles:
                roles_to_add = [{'group_id': new_group.id, 'role_id': role_id} for role_id in data.roles]
                self.db.execute(insert(group_role_association).values(roles_to_add))

            # Associate users with the new group
            if data.users:
                users_to_add = [{'group_id': new_group.id, 'user_id': user_id} for user_id in data.users]
                self.db.execute(insert(user_group_association).values(users_to_add))

            self.db.commit() # Commit association changes
            self.db.refresh(new_group) # Refresh to load associations

        except IntegrityError:
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Group creation failed due to database constraint"
            )
        return self.get_group_by_id(new_group.id) # Use get_group_by_id to return full schema

    def list_groups(self, skip: int = 0, limit: int = 100) -> Dict[str, Any]:
        total = self.db.query(Group).count()
        groups = self.db.query(Group).options(joinedload(Group.roles), joinedload(Group.users)).offset(skip).limit(limit).all()
        
        # Enrich each group with built_in association IDs
        enriched_groups = []
        for group in groups:
            built_in_role_ids = [
                r.role_id for r in self.db.query(group_role_association.c.role_id).filter(
                    group_role_association.c.group_id == group.id,
                    group_role_association.c.built_in
                ).all()
            ]
            built_in_user_ids = [
                u.user_id for u in self.db.query(user_group_association.c.user_id).filter(
                    user_group_association.c.group_id == group.id,
                    user_group_association.c.built_in
                ).all()
            ]
            
            group_response = GroupResponseSchema.model_validate(group)
            group_response.built_in_role_ids = built_in_role_ids
            group_response.built_in_user_ids = built_in_user_ids
            enriched_groups.append(group_response)
        
        return {"total": total, "groups": enriched_groups}

    def update_group(self, group_id: int, data: UpdateGroupSchema) -> GroupResponseSchema:
        group_orm = self.db.query(Group).filter(Group.id == group_id).first() # Fetch ORM object
        if not group_orm:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Group not found"
            )
        if group_orm.built_in:
            if 'name' in data.model_dump(exclude_unset=True) and data.name != group_orm.name:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cannot change name of a built-in group"
                )
        
        # Get current built_in role/user associations BEFORE updating
        current_built_in_role_ids = {r.role_id for r in self.db.query(group_role_association.c.role_id).filter(
            group_role_association.c.group_id == group_id,
            group_role_association.c.built_in
        ).all()}
        current_built_in_user_ids = {u.user_id for u in self.db.query(user_group_association.c.user_id).filter(
            user_group_association.c.group_id == group_id,
            user_group_association.c.built_in
        ).all()}

        # Handle role updates
        if data.roles is not None:
            # Prevent removing built-in roles from built-in groups
            if group_orm.built_in:
                new_role_ids = set(data.roles)
                if not current_built_in_role_ids.issubset(new_role_ids):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Cannot remove built-in roles from a built-in group"
                    )

            # Remove existing roles not in new list
            roles_to_remove_stmt = delete(group_role_association).where(
                group_role_association.c.group_id == group_id,
                group_role_association.c.role_id.notin_(data.roles)
            )
            self.db.execute(roles_to_remove_stmt)

            # Add new roles not currently associated
            current_role_ids_query = self.db.query(group_role_association.c.role_id).filter(group_role_association.c.group_id == group_id)
            current_role_ids = {r for r, in current_role_ids_query.all()}

            # Filter out non-existent role_ids before attempting to add
            existing_role_ids = {r.id for r in self.db.query(Role).filter(Role.id.in_(data.roles)).all()}

            roles_to_add = [
                {'group_id': group_id, 'role_id': role_id}
                for role_id in data.roles if role_id not in current_role_ids and role_id in existing_role_ids
            ]
            if roles_to_add:
                self.db.execute(insert(group_role_association).values(roles_to_add))
        
        # Handle user updates
        if data.users is not None:
            # Prevent removing built-in users from built-in groups
            if group_orm.built_in:
                new_user_ids = set(data.users)
                if not current_built_in_user_ids.issubset(new_user_ids):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Cannot remove built-in users from a built-in group"
                    )

            # Remove existing users not in new list
            users_to_remove_stmt = delete(user_group_association).where(
                user_group_association.c.group_id == group_id,
                user_group_association.c.user_id.notin_(data.users)
            )
            self.db.execute(users_to_remove_stmt)

            # Add new users not currently associated
            current_user_ids_query = self.db.query(user_group_association.c.user_id).filter(user_group_association.c.group_id == group_id)
            current_user_ids = {u for u, in current_user_ids_query.all()}

            users_to_add = [
                {'group_id': group_id, 'user_id': user_id}
                for user_id in data.users if user_id not in current_user_ids
            ]
            if users_to_add:
                self.db.execute(insert(user_group_association).values(users_to_add))
        
        # Update other fields
        update_data = data.model_dump(exclude_unset=True, exclude={"roles", "users"})
        for field, value in update_data.items():
            setattr(group_orm, field, value)
            
        try:
            self.db.commit()
            self.db.refresh(group_orm) # Refresh ORM object
        except IntegrityError:
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to update group due to database constraint"
            )
        return self.get_group_by_id(group_orm.id) # Use get_group_by_id to return full schema

    def delete_group(self, group_id: int):
        group_orm = self.db.query(Group).filter(Group.id == group_id).first() # Fetch ORM object
        if not group_orm:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Group not found"
            )
        if group_orm.built_in:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete a built-in group"
            )
        
        try:
            self.db.delete(group_orm) # Delete ORM object
            self.db.commit()
        except IntegrityError:
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to delete group due to database constraint"
            )
        return {"detail": "Group deleted"}
