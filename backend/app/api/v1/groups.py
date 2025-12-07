from fastapi import APIRouter, Depends
from typing import List

from app.users.groups.services import GroupService
from app.users.groups.schemas import (
    CreateGroupSchema,
    UpdateGroupSchema,
    GroupResponseSchema,
    PaginatedGroupResponse
)
from app.auth.dependencies import get_current_user, permission_checker

router = APIRouter(prefix="/groups", tags=['Groups'])

@router.get(
    "/", 
    response_model=PaginatedGroupResponse,
    dependencies=[Depends(permission_checker(["users:view"]))]
)
def list_groups(
    service: GroupService = Depends(), 
    skip: int = 0, 
    limit: int = 100, 
    current_user = Depends(get_current_user)
):
    return service.list_groups(skip=skip, limit=limit)

@router.get(
    "/{group_id}", 
    response_model=GroupResponseSchema,
    dependencies=[Depends(permission_checker(["users:view"]))]
)
def get_group_by_id(
    group_id: int, 
    service: GroupService = Depends(),
    current_user = Depends(get_current_user)
):
    return service.get_group_by_id(group_id)

@router.post(
    "/", 
    response_model=GroupResponseSchema,
    dependencies=[Depends(permission_checker(["users:create"]))]
)
def create_group(
    data: CreateGroupSchema, 
    service: GroupService = Depends(), 
    current_user = Depends(get_current_user)
):
    return service.create_group(data)

@router.put(
    "/{group_id}", 
    response_model=GroupResponseSchema,
    dependencies=[Depends(permission_checker(["users:update"]))]
)
def update_group(
    group_id: int, 
    data: UpdateGroupSchema, 
    service: GroupService = Depends(), 
    current_user = Depends(get_current_user)
):
    return service.update_group(group_id, data)

@router.delete(
    "/{group_id}",
    dependencies=[Depends(permission_checker(["users:delete"]))]
)
def delete_group(
    group_id: int, 
    service: GroupService = Depends(), 
    current_user = Depends(get_current_user)
):
    return service.delete_group(group_id)
