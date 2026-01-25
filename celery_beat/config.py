from typing import Optional
from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
import os

class BeatSettings(BaseSettings):
    REDIS_TASK_URL: str = "redis://redis:6379/0"
    CELERY_BEAT_SCHEDULER: str = "celery_sqlalchemy_scheduler.schedulers.DatabaseScheduler"
    
    POSTGRES_USER: str
    POSTGRES_PASSWORD: str
    POSTGRES_DB: str
    POSTGRES_HOST: str = "db"
    POSTGRES_PORT: int = 5432
    CELERY_BEAT_DB_URL: Optional[str] = None

    CELERY_TIMEZONE: str = "Europe/Moscow"  # Часовой пояс для beat
    CELERY_BEAT_SCHEDULER_URL: str = ""

    @property
    def CELERY_BEAT_SCHEDULER_URL(self) -> str:
        return self.CELERY_BEAT_DB_URL

    @model_validator(mode="after")
    def assemble_db_connection(self) -> "BeatSettings":
        if not self.CELERY_BEAT_DB_URL:
            self.CELERY_BEAT_DB_URL = (
                f"postgresql+psycopg2://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
                f"@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
            )
        return self

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
settings = BeatSettings()
