from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import joinedload  # Добавить импорт joinedload

from app.core.security import hash_password
from app.db.database import db_dependency
from app.users.local.schemas import CreateUserSchema, UpdateUserSchema, UserResponseSchema
from app.users.models import Group, User, user_group_association  # Добавить user_group_association


class UserService:
    def __init__(self, db: db_dependency):
        self.db = db

    def get_user_by_id(self, user_id: int) -> UserResponseSchema:
        user = (
            self.db.query(User).options(joinedload(User.groups)).filter(User.id == user_id).first()
        )
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

        built_in_group_ids = [
            g.group_id
            for g in self.db.query(user_group_association.c.group_id)
            .filter(user_group_association.c.user_id == user_id, user_group_association.c.built_in)
            .all()
        ]

        user_response = UserResponseSchema.model_validate(user)
        user_response.built_in_group_ids = built_in_group_ids

        return user_response

    def get_user_by_login(self, login: str) -> User:
        user = self.db.query(User).filter(User.login == login).first()
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        return user

    def create_user(self, data: CreateUserSchema) -> UserResponseSchema:
        existing_user = self.db.query(User).filter(User.login == data.login).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="User already exists"
            )

        new_user = User(
            login=data.login,
            password=hash_password(data.password),
            name=data.name,
            is_active=data.is_active,
            type=data.type,
        )

        if data.group_ids is not None:
            if not data.group_ids:
                new_user.groups = []
            else:
                groups = (
                    self.db.execute(select(Group).where(Group.id.in_(data.group_ids)))
                    .scalars()
                    .all()
                )
                if len(groups) != len(data.group_ids):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="One or more group IDs are invalid.",
                    )
                new_user.groups = groups

        try:
            self.db.add(new_user)
            self.db.commit()
            self.db.refresh(new_user)  # Обновить для загрузки ассоциаций
        except Exception as e:  # Изменить для перехвата общего исключения
            print(
                f"DEBUG: Exception during create_user commit: {type(e).__name__} - {e}"
            )  # Добавить print для отладки
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"User creation failed: {type(e).__name__} - {e}",  # Включить детали исключения
            ) from None
        return self.get_user_by_id(
            new_user.id
        )  # Использовать get_user_by_id для возврата полной схемы

    def list_users(
        self,
        skip: int = 0,
        limit: int = 100,
        sort_by: str | None = None,
        sort_order: str = "asc",
        login: str | None = None,
        name: str | None = None,
        user_type: str | None = None,
        is_active: bool | None = None,
        created_at_from: str | None = None,
        created_at_to: str | None = None,
    ) -> dict:
        # Базовый запрос
        query = self.db.query(User).options(joinedload(User.groups))

        # Применение фильтров
        if login:
            query = query.filter(User.login.ilike(f"%{login}%"))
        if name:
            query = query.filter(User.name.ilike(f"%{name}%"))
        if user_type:
            query = query.filter(User.type == user_type)
        if is_active is not None:
            query = query.filter(User.is_active == is_active)
        if created_at_from:
            query = query.filter(User.created_at >= created_at_from)
        if created_at_to:
            query = query.filter(User.created_at <= created_at_to)

        # Подсчет общего количества после фильтрации
        total = query.count()

        # Применение сортировки
        if sort_by and hasattr(User, sort_by):
            column = getattr(User, sort_by)
            if sort_order.lower() == "desc":
                query = query.order_by(column.desc())
            else:
                query = query.order_by(column.asc())
        else:
            # Сортировка по умолчанию
            query = query.order_by(User.id.asc())

        users = query.offset(skip).limit(limit).all()

        # Обогатить каждого пользователя ID встроенных групп
        enriched_users = []
        for user in users:
            built_in_group_ids = [
                g.group_id
                for g in self.db.query(user_group_association.c.group_id)
                .filter(
                    user_group_association.c.user_id == user.id, user_group_association.c.built_in
                )
                .all()
            ]

            user_response = UserResponseSchema.model_validate(user)
            user_response.built_in_group_ids = built_in_group_ids
            enriched_users.append(user_response)

        return {"total": total, "items": enriched_users}

    def update_user(self, user_id: int, data: UpdateUserSchema) -> UserResponseSchema:
        user_orm = self.db.query(User).filter(User.id == user_id).first()  # Получить ORM объект
        if not user_orm:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

        update_data = data.model_dump(exclude_unset=True)

        if user_orm.type == "built_in":
            forbidden_fields = ["login", "name", "is_active", "type"]
            for field in forbidden_fields:
                if field in update_data and update_data[field] != getattr(user_orm, field):
                    # Особая проверка для 'type', так как его нельзя изменить вообще для встроенных
                    if field == "type" and update_data[field] != "built_in":
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail="Cannot change type of a built-in user",
                        )
                    elif field != "type":
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"Cannot change {field} of a built-in user",
                        )

        # Получить текущие ассоциации встроенных групп ДО обновления
        current_built_in_group_ids = {
            g.group_id
            for g in self.db.query(user_group_association.c.group_id)
            .filter(user_group_association.c.user_id == user_id, user_group_association.c.built_in)
            .all()
        }

        if "group_ids" in update_data:
            group_ids = update_data.pop("group_ids")
            if group_ids is not None:
                # Запретить удаление встроенных групп из встроенных пользователей
                if user_orm.type == "built_in":
                    new_group_ids = set(group_ids)
                    if not current_built_in_group_ids.issubset(new_group_ids):
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail="Cannot remove built-in groups from a built-in user",
                        )

                if not group_ids:
                    user_orm.groups = []
                else:
                    groups = (
                        self.db.execute(select(Group).where(Group.id.in_(group_ids)))
                        .scalars()
                        .all()
                    )
                    if len(groups) != len(group_ids):
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail="One or more group IDs are invalid.",
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
        except IntegrityError as e:  # Перехват IntegrityError специально
            self.db.rollback()
            # Проверка нарушения уникальности логина
            if "ix_users_login" in str(e.orig):  # e.orig это оригинальная ошибка DBAPI
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="User with this login already exists",
                ) from None
            raise HTTPException(  # Повторный вызов для других ошибок целостности
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Database error during user update: {e}",
            ) from None
        except Exception as e:  # Перехват любых других неожиданных исключений
            # Удалено exc_info=True, так как это недопустимо для print()
            print(f"DEBUG: Exception during update_user commit: {type(e).__name__} - {e}")
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to update user: {type(e).__name__} - {e}",
            ) from None
        return self.get_user_by_id(user_orm.id)

    def delete_user(self, user_id: int):
        user_orm = self.db.query(User).filter(User.id == user_id).first()  # Получить ORM объект
        if not user_orm:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        if user_orm.type == "built_in":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot delete a built-in user"
            )
        try:
            self.db.delete(user_orm)  # Удалить ORM объект
            self.db.commit()
        except IntegrityError:
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to delete user due to database constraint",
            ) from None
        return {"detail": "User deleted"}
