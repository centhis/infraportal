from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import delete, insert
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import joinedload

from app.db.database import db_dependency
from app.users.groups.schemas import CreateGroupSchema, GroupResponseSchema, UpdateGroupSchema
from app.users.models import Group, Role, group_role_association, user_group_association


class GroupService:
    def __init__(self, db: db_dependency):
        self.db = db

    def get_group_by_id(self, group_id: int) -> GroupResponseSchema:
        group = (
            self.db.query(Group)
            .options(joinedload(Group.roles), joinedload(Group.users))
            .filter(Group.id == group_id)
            .first()
        )
        if not group:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found")

        built_in_role_ids = [
            r.role_id
            for r in self.db.query(group_role_association.c.role_id)
            .filter(
                group_role_association.c.group_id == group_id, group_role_association.c.built_in
            )
            .all()
        ]
        built_in_user_ids = [
            u.user_id
            for u in self.db.query(user_group_association.c.user_id)
            .filter(
                user_group_association.c.group_id == group_id, user_group_association.c.built_in
            )
            .all()
        ]

        group_response = GroupResponseSchema.model_validate(group)
        group_response.built_in_role_ids = built_in_role_ids
        group_response.built_in_user_ids = built_in_user_ids

        return group_response

    def create_group(self, data: CreateGroupSchema) -> GroupResponseSchema:
        existing_group = self.db.query(Group).filter(Group.name == data.name).first()
        if existing_group:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Group already exists"
            )

        new_group = Group(name=data.name, description=data.description)
        try:
            self.db.add(new_group)
            self.db.commit()
            self.db.refresh(new_group)

            # Связать роли с новой группой
            if data.roles:
                roles_to_add = [
                    {"group_id": new_group.id, "role_id": role_id} for role_id in data.roles
                ]
                self.db.execute(insert(group_role_association).values(roles_to_add))

            # Связать пользователей с новой группой
            if data.users:
                users_to_add = [
                    {"group_id": new_group.id, "user_id": user_id} for user_id in data.users
                ]
                self.db.execute(insert(user_group_association).values(users_to_add))

            self.db.commit()  # Фиксировать изменения ассоциаций
            self.db.refresh(new_group)  # Обновить для загрузки ассоциаций

        except IntegrityError:
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Group creation failed due to database constraint",
            ) from None
        return self.get_group_by_id(
            new_group.id
        )  # Использовать get_group_by_id для возврата полной схемы

    def list_groups(
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
        query = self.db.query(Group).options(joinedload(Group.roles), joinedload(Group.users))

        # Применение фильтров
        if name:
            query = query.filter(Group.name.ilike(f"%{name}%"))
        if built_in is not None:
            query = query.filter(Group.built_in == built_in)
        if created_at_from:
            query = query.filter(Group.created_at >= created_at_from)
        if created_at_to:
            query = query.filter(Group.created_at <= created_at_to)

        # Подсчет общего количества после фильтрации
        total = query.count()

        # Применение сортировки
        if sort_by and hasattr(Group, sort_by):
            column = getattr(Group, sort_by)
            if sort_order.lower() == "desc":
                query = query.order_by(column.desc())
            else:
                query = query.order_by(column.asc())
        else:
            # Сортировка по умолчанию
            query = query.order_by(Group.id.asc())

        groups = query.offset(skip).limit(limit).all()

        # Обогатить каждую группу ID встроенных ассоциаций
        enriched_groups = []
        for group in groups:
            built_in_role_ids = [
                r.role_id
                for r in self.db.query(group_role_association.c.role_id)
                .filter(
                    group_role_association.c.group_id == group.id, group_role_association.c.built_in
                )
                .all()
            ]
            built_in_user_ids = [
                u.user_id
                for u in self.db.query(user_group_association.c.user_id)
                .filter(
                    user_group_association.c.group_id == group.id, user_group_association.c.built_in
                )
                .all()
            ]

            group_response = GroupResponseSchema.model_validate(group)
            group_response.built_in_role_ids = built_in_role_ids
            group_response.built_in_user_ids = built_in_user_ids
            enriched_groups.append(group_response)

        return {"total": total, "items": enriched_groups}

    def update_group(self, group_id: int, data: UpdateGroupSchema) -> GroupResponseSchema:
        group_orm = self.db.query(Group).filter(Group.id == group_id).first()  # Получить ORM объект
        if not group_orm:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found")
        if group_orm.built_in:
            if "name" in data.model_dump(exclude_unset=True) and data.name != group_orm.name:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cannot change name of a built-in group",
                )

        # Получить текущие ассоциации встроенных ролей/пользователей ДО обновления
        current_built_in_role_ids = {
            r.role_id
            for r in self.db.query(group_role_association.c.role_id)
            .filter(
                group_role_association.c.group_id == group_id, group_role_association.c.built_in
            )
            .all()
        }
        current_built_in_user_ids = {
            u.user_id
            for u in self.db.query(user_group_association.c.user_id)
            .filter(
                user_group_association.c.group_id == group_id, user_group_association.c.built_in
            )
            .all()
        }

        # Обработка обновлений ролей
        if data.roles is not None:
            # Запретить удаление встроенных ролей из встроенных групп
            if group_orm.built_in:
                new_role_ids = set(data.roles)
                if not current_built_in_role_ids.issubset(new_role_ids):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Cannot remove built-in roles from a built-in group",
                    )

            # Удалить существующие роли, которых нет в новом списке
            roles_to_remove_stmt = delete(group_role_association).where(
                group_role_association.c.group_id == group_id,
                group_role_association.c.role_id.notin_(data.roles),
            )
            self.db.execute(roles_to_remove_stmt)

            # Добавить новые роли, которые еще не связаны
            current_role_ids_query = self.db.query(group_role_association.c.role_id).filter(
                group_role_association.c.group_id == group_id
            )
            current_role_ids = {r for (r,) in current_role_ids_query.all()}

            # Отфильтровать несуществующие role_ids перед добавлением
            existing_role_ids = {
                r.id for r in self.db.query(Role).filter(Role.id.in_(data.roles)).all()
            }

            roles_to_add = [
                {"group_id": group_id, "role_id": role_id}
                for role_id in data.roles
                if role_id not in current_role_ids and role_id in existing_role_ids
            ]
            if roles_to_add:
                self.db.execute(insert(group_role_association).values(roles_to_add))

        # Обработка обновлений пользователей
        if data.users is not None:
            # Запретить удаление встроенных пользователей из встроенных групп
            if group_orm.built_in:
                new_user_ids = set(data.users)
                if not current_built_in_user_ids.issubset(new_user_ids):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Cannot remove built-in users from a built-in group",
                    )

            # Удалить существующих пользователей, которых нет в новом списке
            users_to_remove_stmt = delete(user_group_association).where(
                user_group_association.c.group_id == group_id,
                user_group_association.c.user_id.notin_(data.users),
            )
            self.db.execute(users_to_remove_stmt)

            # Добавить новых пользователей, которые еще не связаны
            current_user_ids_query = self.db.query(user_group_association.c.user_id).filter(
                user_group_association.c.group_id == group_id
            )
            current_user_ids = {u for (u,) in current_user_ids_query.all()}

            users_to_add = [
                {"group_id": group_id, "user_id": user_id}
                for user_id in data.users
                if user_id not in current_user_ids
            ]
            if users_to_add:
                self.db.execute(insert(user_group_association).values(users_to_add))

        # Обновить остальные поля
        update_data = data.model_dump(exclude_unset=True, exclude={"roles", "users"})
        for field, value in update_data.items():
            setattr(group_orm, field, value)

        try:
            self.db.commit()
            self.db.refresh(group_orm)  # Обновить ORM объект
        except IntegrityError:
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to update group due to database constraint",
            ) from None
        return self.get_group_by_id(
            group_orm.id
        )  # Использовать get_group_by_id для возврата полной схемы

    def delete_group(self, group_id: int):
        group_orm = self.db.query(Group).filter(Group.id == group_id).first()  # Получить ORM объект
        if not group_orm:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found")
        if group_orm.built_in:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot delete a built-in group"
            )

        try:
            self.db.delete(group_orm)  # Удалить ORM объект
            self.db.commit()
        except IntegrityError:
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to delete group due to database constraint",
            ) from None
        return {"detail": "Group deleted"}
