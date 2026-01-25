from fastapi import APIRouter, Depends

from app.users.roles.services import RoleService
from app.users.roles.schemas import (
    CreateRoleSchema,
    UpdateRoleSchema,
    RoleResponseSchema,
    PaginatedRoleResponse
)
from app.auth.dependencies import get_current_user, permission_checker

router = APIRouter(prefix="/roles", tags=['Roles'])

@router.get(
    "/", 
    response_model=PaginatedRoleResponse,
    dependencies=[Depends(permission_checker(["users:view"]))]
)
def list_roles(
    service: RoleService = Depends(), 
    skip: int = 0, 
    limit: int = 100, 
    current_user = Depends(get_current_user)
):
    return service.list_roles(skip=skip, limit=limit)

@router.get(
    "/{role_id}", 
    response_model=RoleResponseSchema,
    dependencies=[Depends(permission_checker(["users:view"]))]
)
def get_role_by_id(
    role_id: int, 
    service: RoleService = Depends(),
    current_user = Depends(get_current_user)
):
    return service.get_role_by_id(role_id)

@router.post(
    "/", 
    response_model=RoleResponseSchema,
    dependencies=[Depends(permission_checker(["users:create"]))]
)
def create_role(
    data: CreateRoleSchema, 
    service: RoleService = Depends(), 
    current_user = Depends(get_current_user)
):
    return service.create_role(data)

@router.put(
    "/{role_id}", 
    response_model=RoleResponseSchema,
    dependencies=[Depends(permission_checker(["users:update"]))]
)
def update_role(
    role_id: int, 
    data: UpdateRoleSchema, 
    service: RoleService = Depends(), 
    current_user = Depends(get_current_user)
):
    return service.update_role(role_id, data)

@router.delete(
    "/{role_id}",
    dependencies=[Depends(permission_checker(["users:delete"]))]
)
def delete_role(
    role_id: int, 
    service: RoleService = Depends(), 
    current_user = Depends(get_current_user)
):
    return service.delete_role(role_id)
