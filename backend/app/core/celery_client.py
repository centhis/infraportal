from celery import Celery

from .config import settings

celery_client = Celery(
    "backend_client",
    broker=settings.REDIS_TASK_URL,
    backend=None,  # Бэкенду не нужно читать результаты
    include=[],  # Убедимся, что он не ищет и не загружает код задач
)
