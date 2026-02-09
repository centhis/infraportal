# celery_worker/utils.py
import logging
from typing import Optional
import httpx
from config import settings

logger = logging.getLogger(__name__)

def get_secret_for_task(task_type: str) -> Optional[str]:
    """
    Запрашивает и возвращает секрет для заданного типа задачи
    из внутреннего API бэкенда.

    Args:
        task_type: Тип задачи, для которой нужен секрет.

    Returns:
        Секрет в виде строки или None, если секрет не найден.

    Raises:
        ValueError: Если не удалось подключиться к бэкенду или получить секрет.
    """
    logger.info(f"Requesting secret for task_type='{task_type}'")
    try:
        headers = {"X-API-Key": settings.CELERY_WORKER_API_KEY}
        response = httpx.post(
            f"{settings.BACKEND_INTERNAL_API_URL}/secrets",
            json={"task_type": task_type},
            headers=headers,
            timeout=10.0
        )
        response.raise_for_status()
        secret = response.json().get("secret")
        logger.info(f"Secret for task_type='{task_type}' successfully retrieved.")
        return secret
    except httpx.HTTPStatusError as e:
        logger.error(f"HTTP error when getting secret for task_type '{task_type}': {e.response.status_code} - {e.response.text}")
        raise ValueError(f"Failed to get secret: HTTP {e.response.status_code}")
    except httpx.RequestError as e:
        logger.error(f"Request error when getting secret for task_type '{task_type}': {e}")
        raise ValueError(f"Failed to connect to backend to get secret: {e}")
