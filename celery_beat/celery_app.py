from celery import Celery
from config import settings

celery_app = Celery("celery_beat", broker=settings.REDIS_TASK_URL)
celery_app.config_from_object('config')
# Celery Beat не импортирует задачи, он получает их имена из БД.
celery_app.conf.update(
    CELERY_TIMEZONE=settings.CELERY_TIMEZONE,
    CELERY_BEAT_SCHEDULER=settings.CELERY_BEAT_SCHEDULER,
    CELERY_BEAT_SCHEDULER_URL=settings.CELERY_BEAT_SCHEDULER_URL,
)
