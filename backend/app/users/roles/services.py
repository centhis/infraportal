from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import delete, insert
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import joinedload

from app.db.database import db_dependency
from app.users.models import Role, role_permission_association
from app.users.roles.schemas import CreateRoleSchema, RoleResponseSchema, UpdateRoleSchema


class RoleService:
    def __init__(self, db: db_dependency):
        self.db = db

    def get_role_by_id(self, role_id: int) -> RoleResponseSchema:
        role = (
            self.db.query(Role)
            .options(joinedload(Role.permissions))
            .filter(Role.id == role_id)
            .first()
        )
        if not role:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Role not found")

        built_in_permission_ids = [
            p.permission_id
            for p in self.db.query(role_permission_association.c.permission_id)
            .filter(
                role_permission_association.c.role_id == role_id,
                role_permission_association.c.built_in,
            )
            .all()
        ]

        role_response = RoleResponseSchema.model_validate(role)
        role_response.built_in_permission_ids = built_in_permission_ids

        return role_response

    def create_role(self, data: CreateRoleSchema) -> RoleResponseSchema:
        existing_role = self.db.query(Role).filter(Role.name == data.name).first()
        if existing_role:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Role already exists"
            )

        new_role = Role(name=data.name, description=data.description)
        try:
            self.db.add(new_role)
            self.db.commit()
            self.db.refresh(new_role)

            # Связать разрешения с новой ролью
            if data.permissions:
                permissions_to_add = [
                    {"role_id": new_role.id, "permission_id": permission_id}
                    for permission_id in data.permissions
                ]
                self.db.execute(insert(role_permission_association).values(permissions_to_add))

            self.db.commit()  # Фиксировать изменения ассоциаций
            self.db.refresh(new_role)  # Обновить для загрузки ассоциаций

        except IntegrityError:
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Role creation failed due to database constraint",
            ) from None
        return self.get_role_by_id(
            new_role.id
        )  # Использовать get_role_by_id для возврата полной схемы

    def list_roles(
        self,
        skip: int = 0,
        limit: int = 100,
        sort_by: str | None = None,
        sort_order: str = "asc",
        name: str | None = None,
        built_in: bool | None = None,
        created_at_from: str | None = None,
        created_at_to: str | None = None,
    ) -> dict[str, Any]:
        # Базовый запрос
        query = self.db.query(Role).options(joinedload(Role.permissions))

        # Применение фильтров
        if name:
            query = query.filter(Role.name.ilike(f"%{name}%"))
        if built_in is not None:
            query = query.filter(Role.built_in == built_in)
        if created_at_from:
            query = query.filter(Role.created_at >= created_at_from)
        if created_at_to:
            query = query.filter(Role.created_at <= created_at_to)

        # Подсчет общего количества после фильтрации
        total = query.count()

        # Применение сортировки
        if sort_by and hasattr(Role, sort_by):
            column = getattr(Role, sort_by)
            if sort_order.lower() == "desc":
                query = query.order_by(column.desc())
            else:
                query = query.order_by(column.asc())
        else:
            # Сортировка по умолчанию
            query = query.order_by(Role.id.asc())

        roles = query.offset(skip).limit(limit).all()

        # Обогатить каждую роль ID встроенных разрешений
        enriched_roles = []
        for role in roles:
            built_in_permission_ids = [
                p.permission_id
                for p in self.db.query(role_permission_association.c.permission_id)
                .filter(
                    role_permission_association.c.role_id == role.id,
                    role_permission_association.c.built_in,
                )
                .all()
            ]

            role_response = RoleResponseSchema.model_validate(role)
            role_response.built_in_permission_ids = built_in_permission_ids
            enriched_roles.append(role_response)

        return {"total": total, "items": enriched_roles}

    def update_role(self, role_id: int, data: UpdateRoleSchema) -> RoleResponseSchema:
        role_orm = self.db.query(Role).filter(Role.id == role_id).first()  # Получить ORM объект
        if not role_orm:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Role not found")
        if role_orm.built_in:
            if "name" in data.model_dump(exclude_unset=True) and data.name != role_orm.name:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cannot change name of a built-in role",
                )

        # Получить текущие встроенные разрешения ДО обновления
        current_built_in_permission_ids = {
            p.permission_id
            for p in self.db.query(role_permission_association.c.permission_id)
            .filter(
                role_permission_association.c.role_id == role_id,
                role_permission_association.c.built_in,
            )
            .all()
        }

        # Обработка обновлений разрешений
        if data.permissions is not None:
            # Запретить удаление встроенных разрешений из встроенных ролей
            if role_orm.built_in:
                new_permission_ids = set(data.permissions)
                if not current_built_in_permission_ids.issubset(new_permission_ids):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Cannot remove built-in permissions from a built-in role",
                    )

            # Удалить существующие разрешения, которых нет в новом списке
            permissions_to_remove_stmt = delete(role_permission_association).where(
                role_permission_association.c.role_id == role_id,
                role_permission_association.c.permission_id.notin_(data.permissions),
            )
            self.db.execute(permissions_to_remove_stmt)

            # Добавить новые разрешения, которые еще не связаны
            current_permission_ids_query = self.db.query(
                role_permission_association.c.permission_id
            ).filter(role_permission_association.c.role_id == role_id)
            current_permission_ids = {p for (p,) in current_permission_ids_query.all()}

            permissions_to_add = [
                {"role_id": role_id, "permission_id": permission_id}
                for permission_id in data.permissions
                if permission_id not in current_permission_ids
            ]
            if permissions_to_add:
                self.db.execute(insert(role_permission_association).values(permissions_to_add))

        # Обновить остальные поля
        update_data = data.model_dump(exclude_unset=True, exclude={"permissions"})
        for field, value in update_data.items():
            setattr(role_orm, field, value)

        try:
            self.db.commit()
            self.db.refresh(role_orm)
        except IntegrityError:
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to update role due to database constraint",
            ) from None
        return self.get_role_by_id(role_orm.id)

    def delete_role(self, role_id: int):
        role_orm = self.db.query(Role).filter(Role.id == role_id).first()  # Получить ORM объект
        if not role_orm:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Role not found")
        if role_orm.built_in:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot delete a built-in role"
            )

        try:
            self.db.delete(role_orm)  # Удалить ORM объект
            self.db.commit()
        except IntegrityError:
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to delete role due to database constraint",
            ) from None
        return {"detail": "Role deleted"}
