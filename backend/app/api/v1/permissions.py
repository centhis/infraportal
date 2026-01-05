from typing import List
from fastapi import APIRouter, Depends

from app.users.permissions.schemas import PermissionResponseSchema
from app.users.permissions.services import PermissionService
from app.auth.dependencies import permission_checker

router = APIRouter(
    prefix="/permissions",
    tags=["Permissions"],
    dependencies=[Depends(permission_checker(["users:view"]))]
)

@router.get("/", response_model=List[PermissionResponseSchema])
async def list_permissions(
    permission_service: PermissionService = Depends()
):
    """
    Get a list of all available permissions.
    """
    return permission_service.list_permissions()
