from fastapi import APIRouter, Depends

from app.auth.dependencies import get_current_user, permission_checker
from app.users.groups.schemas import (
    CreateGroupSchema,
    GroupResponseSchema,
    PaginatedGroupResponse,
    UpdateGroupSchema,
)
from app.users.groups.services import GroupService

router = APIRouter(prefix="/groups", tags=["Groups"])


@router.get(
    "/",
    response_model=PaginatedGroupResponse,
    dependencies=[Depends(permission_checker(["users:view"]))],
)
def list_groups(
    service: GroupService = Depends(),
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
    Получение списка групп с пагинацией и фильтрацией.
    Требует права `users:view`.
    """
    return service.list_groups(
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
    "/{group_id}",
    response_model=GroupResponseSchema,
    dependencies=[Depends(permission_checker(["users:view"]))],
)
def get_group_by_id(
    group_id: int, service: GroupService = Depends(), current_user=Depends(get_current_user)
):
    """
    Получение детальной информации о группе по ID.
    Требует права `users:view`.
    """
    return service.get_group_by_id(group_id)


@router.post(
    "/",
    response_model=GroupResponseSchema,
    dependencies=[Depends(permission_checker(["users:create"]))],
)
def create_group(
    data: CreateGroupSchema,
    service: GroupService = Depends(),
    current_user=Depends(get_current_user),
):
    """
    Создание новой группы.
    Требует права `users:create`.
    """
    return service.create_group(data)


@router.put(
    "/{group_id}",
    response_model=GroupResponseSchema,
    dependencies=[Depends(permission_checker(["users:update"]))],
)
def update_group(
    group_id: int,
    data: UpdateGroupSchema,
    service: GroupService = Depends(),
    current_user=Depends(get_current_user),
):
    """
    Обновление существующей группы.
    Требует права `users:update`.
    """
    return service.update_group(group_id, data)


@router.delete("/{group_id}", dependencies=[Depends(permission_checker(["users:delete"]))])
def delete_group(
    group_id: int, service: GroupService = Depends(), current_user=Depends(get_current_user)
):
    """
    Удаление группы.
    Требует права `users:delete`.
    """
    return service.delete_group(group_id)
