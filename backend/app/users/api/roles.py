from fastapi import APIRouter, Depends

from app.auth.dependencies import get_current_user, permission_checker
from app.users.roles.schemas import (
    CreateRoleSchema,
    PaginatedRoleResponse,
    RoleResponseSchema,
    UpdateRoleSchema,
)
from app.users.roles.services import RoleService

router = APIRouter(prefix="/roles", tags=["Roles"])


@router.get(
    "/",
    response_model=PaginatedRoleResponse,
    dependencies=[Depends(permission_checker(["users:view"]))],
)
def list_roles(
    service: RoleService = Depends(),
    skip: int = 0,
    limit: int = 100,
    sort_by: str | None = None,
    sort_order: str = "asc",
    name: str | None = None,
    built_in: bool | None = None,
    created_at_from: str | None = None,
    created_at_to: str | None = None,
    current_user=Depends(get_current_user),
):
    """
    Получение списка ролей с пагинацией и фильтрацией.
    Требует права `users:view`.
    """
    return service.list_roles(
        skip=skip,
        limit=limit,
        sort_by=sort_by,
        sort_order=sort_order,
        name=name,
        built_in=built_in,
        created_at_from=created_at_from,
        created_at_to=created_at_to,
    )


@router.get(
    "/{role_id}",
    response_model=RoleResponseSchema,
    dependencies=[Depends(permission_checker(["users:view"]))],
)
def get_role_by_id(
    role_id: int, service: RoleService = Depends(), current_user=Depends(get_current_user)
):
    """
    Получение детальной информации о роли по ID.
    Требует права `users:view`.
    """
    return service.get_role_by_id(role_id)


@router.post(
    "/",
    response_model=RoleResponseSchema,
    dependencies=[Depends(permission_checker(["users:create"]))],
)
def create_role(
    data: CreateRoleSchema, service: RoleService = Depends(), current_user=Depends(get_current_user)
):
    """
    Создание новой роли.
    Требует права `users:create`.
    """
    return service.create_role(data)


@router.put(
    "/{role_id}",
    response_model=RoleResponseSchema,
    dependencies=[Depends(permission_checker(["users:update"]))],
)
def update_role(
    role_id: int,
    data: UpdateRoleSchema,
    service: RoleService = Depends(),
    current_user=Depends(get_current_user),
):
    """
    Обновление существующей роли.
    Требует права `users:update`.
    """
    return service.update_role(role_id, data)


@router.delete("/{role_id}", dependencies=[Depends(permission_checker(["users:delete"]))])
def delete_role(
    role_id: int, service: RoleService = Depends(), current_user=Depends(get_current_user)
):
    """
    Удаление роли.
    Требует права `users:delete`.
    """
    return service.delete_role(role_id)
