from typing import List
from sqlalchemy.orm import Session
from app.db.database import db_dependency
from app.users.models import User, Group, Role, Permission, user_group_association, group_role_association, role_permission_association

class PermissionService:
    def __init__(self, db: db_dependency):
        self.db = db

    def get_user_permissions(self, user_id: int) -> List[str]:
        """
        Get a list of all permissions for a given user.
        """
        permissions = self.db.query(Permission.name).join(
            role_permission_association
        ).join(
            group_role_association,
            group_role_association.c.role_id == role_permission_association.c.role_id
        ).join(
            user_group_association,
            user_group_association.c.group_id == group_role_association.c.group_id
        ).filter(
            user_group_association.c.user_id == user_id
        ).distinct().all()

        return [p[0] for p in permissions]

    def list_permissions(self) -> List[Permission]:
        """
        Get a list of all permissions.
        """
        return self.db.query(Permission).all()
