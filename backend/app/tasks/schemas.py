from typing import Any

from pydantic import BaseModel, Field

from app.tasks.models import ExecutionStatus


class WorkerStatsSchema(BaseModel):
    """Статистика отдельного воркера."""

    name: str
    status: bool
    active_tasks: int
    concurrency: int
    queued_tasks: int
    memory_usage: int  # КБ


class WorkerHealthResponseSchema(BaseModel):
    """Схема ответа о состоянии воркеров."""

    active_workers: int
    active_tasks: int = 0
    queued_tasks: int = 0
    status: str
    workers: list[WorkerStatsSchema] = []


class SecretsRequest(BaseModel):
    task_type: str


class TaskExecutionRequest(BaseModel):
    schedule_id: str


class TaskResultRequest(BaseModel):
    result: dict[str, Any]
    status: ExecutionStatus = ExecutionStatus.SUCCESS


class CleanupZombieParams(BaseModel):
    """
    Параметры задачи очистки зомби-задач.
    """

    timeout_seconds: int = Field(
        default=300, description="Таймаут (сек) после которого задача считается зависшей"
    )
