from fastapi import APIRouter, Depends, HTTPException, status

from app.users.local.services import UserService
from app.users.permissions.services import PermissionService
from app.users.local.schemas import UserResponseSchema, CreateUserSchema, UpdateUserSchema, PaginatedUserResponse, UserPermissionsReportSchema
from app.auth.dependencies import get_current_user, permission_checker

router = APIRouter(prefix="/users", tags=['Users'])

@router.get(
    "/", 
    response_model=PaginatedUserResponse, 
    dependencies=[Depends(permission_checker(["users:view"]))]
)
def list_users(
    service: UserService = Depends(), 
    skip: int = 0, 
    limit: int = 100, 
    current_user = Depends(get_current_user)
):
    return service.list_users(skip=skip, limit=limit)

@router.get(
    "/{user_id}", 
    response_model=UserResponseSchema,
)
def get_user_by_id(
    user_id: int, 
    service: UserService = Depends(),
    permission_service: PermissionService = Depends(),
    current_user = Depends(get_current_user)
):
    # Allow user to view their own profile without users:view permission
    if user_id == current_user.id:
        return service.get_user_by_id(user_id)
    
    # For any other user, require users:view permission
    user_permissions_report = permission_service.get_user_permissions_report(current_user.id)
    if "users:view" not in [p.name for p in user_permissions_report.all_unique_permissions]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to perform this action"
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
    current_user = Depends(get_current_user)
):
    # Allow user to view their own profile by login without users:view permission
    if login == current_user.login:
        return service.get_user_by_login(login)
    
    # For any other user, require users:view permission
    user_permissions_report = permission_service.get_user_permissions_report(current_user.id)
    if "users:view" not in [p.name for p in user_permissions_report.all_unique_permissions]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to perform this action"
        )
    return service.get_user_by_login(login)

@router.post(
    "/", 
    response_model=UserResponseSchema,
    dependencies=[Depends(permission_checker(["users:create"]))]
)
def create_user(
    data: CreateUserSchema, 
    service: UserService = Depends(), 
    current_user = Depends(get_current_user)
):
    return service.create_user(data)

@router.put(
    "/{user_id}", 
    response_model=UserResponseSchema,
    dependencies=[Depends(permission_checker(["users:update"]))]
)
def update_user(
    user_id: int, 
    data: UpdateUserSchema, 
    service: UserService = Depends(), 
    current_user = Depends(get_current_user)
):
    return service.update_user(user_id, data)

@router.delete(
    "/{user_id}",
    dependencies=[Depends(permission_checker(["users:delete"]))]
)
def delete_user(
    user_id: int, 
    service: UserService = Depends(), 
    current_user = Depends(get_current_user)
):
    return service.delete_user(user_id)

@router.get(
    "/{user_id}/permissions_report",
    response_model=UserPermissionsReportSchema,
    dependencies=[Depends(permission_checker(["users:view"]))]
)
def get_user_permissions_report(
    user_id: int,
    permission_service: PermissionService = Depends(), 
    current_user = Depends(get_current_user)
):
    return permission_service.get_user_permissions_report(user_id)
