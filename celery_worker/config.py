# celery_worker/config.py
from pydantic_settings import BaseSettings, SettingsConfigDict

class WorkerSettings(BaseSettings):
    REDIS_TASK_URL: str = "redis://redis:6379/0"
    REDIS_RESULT_URL: str = "redis://redis:6379/1"
    CELERY_TIMEZONE: str = "Europe/Moscow"
    CELERY_ENABLE_UTC: bool = True
    CELERY_ACCEPT_CONTENT: list[str] = ['json']
    CELERY_TASK_SERIALIZER: str = 'json'
    CELERY_RESULT_SERIALIZER: str = 'json'
    # CELERY_IMPORTS не указываем, т.к. используется autodiscover_tasks

    BACKEND_INTERNAL_API_URL: str
    CELERY_WORKER_API_KEY: str

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
settings = WorkerSettings()
