from fastapi import APIRouter, Depends

from app.auth.dependencies import permission_checker
from app.users.permissions.schemas import PermissionResponseSchema
from app.users.permissions.services import PermissionService

router = APIRouter(
    prefix="/permissions",
    tags=["Permissions"],
    dependencies=[Depends(permission_checker(["users:view"]))],
)


@router.get("/", response_model=list[PermissionResponseSchema])
async def list_permissions(permission_service: PermissionService = Depends()):
    """
    Получает список всех доступных разрешений.
    """
    return permission_service.list_permissions()
