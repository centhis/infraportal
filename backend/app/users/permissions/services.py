from typing import List, Dict # Добавлен Set и Dict
from sqlalchemy.orm import joinedload # Добавлен joinedload
from fastapi import HTTPException, status # Добавлены для обработки ошибок

from app.db.database import db_dependency
from app.users.models import User, Group, Role, Permission, user_group_association, group_role_association, role_permission_association
from app.users.local.schemas import UserPermissionsReportSchema, GroupWithRolesAndPermissionsSchema, RoleWithPermissionsSchema # Импортированы новые схемы
from app.users.permissions.schemas import PermissionResponseSchema # Импортирована схема разрешений

class PermissionService:
    def __init__(self, db: db_dependency):
        self.db = db

    def get_user_permissions(self, user_id: int) -> List[str]:
        """
        Получает список всех разрешений для данного пользователя.
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

        permission_names = [p[0] for p in permissions]
        return permission_names

    def list_permissions(self) -> List[Permission]:
        """
        Получает список всех разрешений.
        """
        return self.db.query(Permission).all()

    def get_user_permissions_report(self, user_id: int) -> UserPermissionsReportSchema:
        """
        Получает детализированный отчет о разрешениях для данного пользователя,
        сгруппированный по группам и ролям.
        """
        user_orm = self.db.query(User).options(
            joinedload(User.groups).joinedload(Group.roles).joinedload(Role.permissions)
        ).filter(User.id == user_id).first()

        if not user_orm:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Пользователь не найден")

        # Используем словарь для сбора уникальных разрешений по их ID
        all_unique_permissions_map: Dict[int, PermissionResponseSchema] = {}
        groups_with_roles_and_permissions: List[GroupWithRolesAndPermissionsSchema] = []

        for group_orm in user_orm.groups:
            roles_with_permissions_schemas: List[RoleWithPermissionsSchema] = []
            for role_orm in group_orm.roles:
                permissions_for_role_schemas: List[PermissionResponseSchema] = []
                for perm_orm in role_orm.permissions:
                    perm_schema = PermissionResponseSchema.model_validate(perm_orm)
                    permissions_for_role_schemas.append(perm_schema)
                    all_unique_permissions_map[perm_schema.id] = perm_schema # Добавляем в карту уникальных

                # Создаем RoleWithPermissionsSchema, явно передавая permissions
                role_schema = RoleWithPermissionsSchema.model_validate(role_orm)
                role_schema.permissions = permissions_for_role_schemas
                roles_with_permissions_schemas.append(role_schema)

            # Создаем GroupWithRolesAndPermissionsSchema, явно передавая roles
            group_schema = GroupWithRolesAndPermissionsSchema.model_validate(group_orm)
            group_schema.roles = roles_with_permissions_schemas
            groups_with_roles_and_permissions.append(group_schema)

        # Конвертируем map в sorted list для детерминированного вывода
        all_unique_permissions_list = sorted(list(all_unique_permissions_map.values()), key=lambda p: p.name)

        return UserPermissionsReportSchema(
            user_id=user_orm.id,
            username=user_orm.login, # Используем user_orm.login как имя пользователя
            all_unique_permissions=all_unique_permissions_list,
            groups_with_roles_and_permissions=groups_with_roles_and_permissions
        )
