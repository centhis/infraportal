from fastapi import APIRouter
from .auth import router as auth_router
from .groups import router as groups_router
from .permissions import router as permissions_router
from .roles import router as roles_router
from .users import router as users_router
from .internal import router as internal_routes


router = APIRouter()
router.include_router(auth_router)
router.include_router(groups_router)
router.include_router(permissions_router)
router.include_router(roles_router)
router.include_router(users_router)

internal_router = APIRouter()
internal_router.include_router(internal_routes)

