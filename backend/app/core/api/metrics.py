import httpx
from fastapi import APIRouter, Depends, HTTPException, status

from app.auth.dependencies import get_current_user
from app.core.config import settings

router = APIRouter(prefix="/metrics", tags=["Metrics"])


@router.get("/celery/status")
async def get_celery_status(
    current_user=Depends(get_current_user),
):
    """
    Проксирует запросы к API Flower для получения статуса воркеров Celery.
    Возвращает агрегированные метрики о воркерах и задачах.
    """
    flower_url = f"{settings.FLOWER_API_URL.rstrip('/')}/api/workers"

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(flower_url, timeout=5.0)

        if response.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Flower API returned error: {response.status_code}",
            )

        workers = response.json()

        # Преобразовать данные для UI если нужно, или вернуть как есть
        # Пока возвращаем сырой ответ Flower, но можно упростить
        return {"workers_count": len(workers), "workers": workers}

    except httpx.RequestError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Could not connect to Flower service: {str(e)}",
        ) from None
