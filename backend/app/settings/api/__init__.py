from fastapi import APIRouter
from .core import router as core_router
from .ldap import router as ldap_router
from .internal import router as internal_secrets_router

router = APIRouter()
router.include_router(core_router)
router.include_router(ldap_router)

internal_router = APIRouter()
internal_router.include_router(internal_secrets_router)
