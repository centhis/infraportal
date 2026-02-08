from fastapi import APIRouter

from .internal import router as internal_routes
from .tasks import router as tasks_router

router = APIRouter()
router.include_router(tasks_router)

internal_router = APIRouter()
internal_router.include_router(internal_routes)
