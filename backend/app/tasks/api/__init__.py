from fastapi import APIRouter
from .tasks import router as tasks_router
from .internal import router as internal_routes

router = APIRouter()
router.include_router(tasks_router)

internal_router = APIRouter()
internal_router.include_router(internal_routes)
