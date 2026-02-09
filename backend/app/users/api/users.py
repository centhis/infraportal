from fastapi import APIRouter, Depends, HTTPException, status

from app.auth.dependencies import get_current_user, permission_checker
from app.users.local.schemas import (
    CreateUserSchema,
    PaginatedUserResponse,
    UpdateUserSchema,
    UserPermissionsReportSchema,
    UserResponseSchema,
)
from app.users.local.services import UserService
from app.users.permissions.services import PermissionService

router = APIRouter(prefix="/users", tags=["Users"])


@router.get(
    "/",
    response_model=PaginatedUserResponse,
    dependencies=[Depends(permission_checker(["users:view"]))],
)
def list_users(
    service: UserService = Depends(),
    skip: int = 0,
    limit: int = 100,
    sort_by: str | None = None,
    sort_order: str = "asc",
    login: str | None = None,
    name: str | None = None,
    type: str | None = None,
    is_active: bool | None = None,
    created_at_from: str | None = None,
    created_at_to: str | None = None,
    current_user=Depends(get_current_user),
):
    """
    Получение списка пользователей с пагинацией и фильтрацией.
    Требует права `users:view`.
    """
    return service.list_users(
        skip=skip,
        limit=limit,
        sort_by=sort_by,
        sort_order=sort_order,
        login=login,
        name=name,
        user_type=type,
        is_active=is_active,
        created_at_from=created_at_from,
        created_at_to=created_at_to,
    )


@router.get(
    "/{user_id}",
    response_model=UserResponseSchema,
)
def get_user_by_id(
    user_id: int,
    service: UserService = Depends(),
    permission_service: PermissionService = Depends(),
    current_user=Depends(get_current_user),
):
    """
    Получение детальной информации о пользователе по ID.
    Пользователь может смотреть свой профиль без особых прав.
    Для просмотра чужих профилей требуется право `users:view`.
    """
    # Разрешить пользователю просматривать свой собственный профиль без разрешения users:view
    if user_id == current_user.id:
        return service.get_user_by_id(user_id)



    # Для любого другого пользователя требовать разрешение users:view
    user_permissions_report = permission_service.get_user_permissions_report(current_user.id)
    if "users:view" not in [p.name for p in user_permissions_report.all_unique_permissions]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to perform this action",
        )
    return service.get_user_by_id(user_id)


@router.get(
    "/by-login/{login}",
    response_model=UserResponseSchema,
)
def get_user_by_login(
    login: str,
    service: UserService = Depends(),
    permission_service: PermissionService = Depends(),
    current_user=Depends(get_current_user),
):
    """
    Получение детальной информации о пользователе по логину.
    Пользователь может смотреть свой профиль без особых прав.
    Для просмотра чужих профилей требуется право `users:view`.
    """
    # Разрешить пользователю просматривать свой собственный профиль по логину без разрешения users:view
    if login == current_user.login:
        return service.get_user_by_login(login)



    # Для любого другого пользователя требовать разрешение users:view
    user_permissions_report = permission_service.get_user_permissions_report(current_user.id)
    if "users:view" not in [p.name for p in user_permissions_report.all_unique_permissions]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to perform this action",
        )
    return service.get_user_by_login(login)


@router.post(
    "/",
    response_model=UserResponseSchema,
    dependencies=[Depends(permission_checker(["users:create"]))],
)
def create_user(
    data: CreateUserSchema, service: UserService = Depends(), current_user=Depends(get_current_user)
):
    """
    Создание нового пользователя.
    Требует права `users:create`.
    """
    return service.create_user(data)


@router.put(
    "/{user_id}",
    response_model=UserResponseSchema,
    dependencies=[Depends(permission_checker(["users:update"]))],
)
def update_user(
    user_id: int,
    data: UpdateUserSchema,
    service: UserService = Depends(),
    current_user=Depends(get_current_user),
):
    """
    Обновление данных пользователя.
    Требует права `users:update`.
    """
    return service.update_user(user_id, data)


@router.delete("/{user_id}", dependencies=[Depends(permission_checker(["users:delete"]))])
def delete_user(
    user_id: int, service: UserService = Depends(), current_user=Depends(get_current_user)
):
    """
    Удаление пользователя.
    Требует права `users:delete`.
    """
    return service.delete_user(user_id)


@router.get(
    "/{user_id}/permissions_report",
    response_model=UserPermissionsReportSchema,
    dependencies=[Depends(permission_checker(["users:view"]))],
)
def get_user_permissions_report(
    user_id: int,
    permission_service: PermissionService = Depends(),
    current_user=Depends(get_current_user),
):
    """
    Получение отчета о всех правах конкретного пользователя (включая права от ролей и групп).
    Требует права `users:view`.
    """
    return permission_service.get_user_permissions_report(user_id)
