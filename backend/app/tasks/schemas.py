from pydantic import BaseModel


class WorkerStatsSchema(BaseModel):
    """Статистика отдельного воркера."""
    name: str
    status: bool
    active_tasks: int
    concurrency: int
    queued_tasks: int
    memory_usage: int  # KB

class WorkerHealthResponseSchema(BaseModel):
    """Схема ответа о состоянии воркеров."""

    active_workers: int
    active_tasks: int = 0
    queued_tasks: int = 0
    status: str
    workers: list[WorkerStatsSchema] = []
