from pathlib import Path
from celery import Celery
from config import settings
from task_registry import autodiscover_handlers

celery_app = Celery(
    "celery_worker",
    broker=settings.REDIS_TASK_URL,
    backend=settings.REDIS_RESULT_URL
)
celery_app.config_from_object('config')

# Автоматически обнаруживаем и регистрируем все обработчики задач
autodiscover_handlers(Path(__file__).parent / "handlers")

# worker будет автообнаруживать задачи из tasks.py
celery_app.autodiscover_tasks(['tasks'])
