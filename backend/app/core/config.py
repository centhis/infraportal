from typing import List, Optional
from pydantic_settings import BaseSettings
from pydantic import field_validator, model_validator


class Settings(BaseSettings):
    API_PREFIX: str = "/api/v1"
    DEBUG: bool = False
    POSTGRES_USER: str
    POSTGRES_PASSWORD: str
    POSTGRES_DB: str
    POSTGRES_HOST: str = "db"
    POSTGRES_PORT: int = 5432
    DATABASE_URL: Optional[str] = None

    ALLOWED_ORIGINS: str = ""
    SECRET_KEY: str = "secret_key"
    ALGORITHM: str = "HS256"
    DEFAULT_ADMIN_USER: str = "admin"
    DEFAULT_ADMIN_PASSWORD: str = "admin"

    # LDAP Settings (Initial seeding via environment)
    LDAP_ENABLED: bool = False
    LDAP_URI: Optional[str] = None
    LDAP_BASE_DN: Optional[str] = None
    LDAP_BIND_DN: Optional[str] = None
    LDAP_BIND_PASSWORD: Optional[str] = None
    LDAP_USER_FILTER: Optional[str] = None
    LDAP_SYNC_SCHEDULE: str = "0 0 * * *"

    REDIS_TASK_URL: str = "redis://redis:6379/0"  # URL брокера для локального клиента
    FLOWER_API_URL: str = "http://flower-service:5555"  # URL для обращения к Flower
    CELERY_WORKER_API_KEY: str  # API-ключ для авторизации worker-а

    # Core Settings (Initial seeding)
    TASK_TIMEOUT: int = 300  # Default 5 minutes


    @field_validator("API_PREFIX")
    def strip_prefix(cls, v: str) -> str:
        return v.strip()

    @field_validator("ALLOWED_ORIGINS")
    def parse_allowed_origins(cls, v: str) -> List[str]:
        return [origin.strip() for origin in v.split(",") if origin.strip()] if v else []

    @model_validator(mode="after")
    def assemble_db_connection(self) -> "Settings":
        if not self.DATABASE_URL:
            self.DATABASE_URL = (
                f"postgresql+psycopg2://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
                f"@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
            )
        return self
    
    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "case_sensitive": True
    }

settings = Settings()