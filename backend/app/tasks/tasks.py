from pydantic import BaseModel, Field


class CleanupZombieTasksParams(BaseModel):
    timeout_seconds: int = Field(
        default=300, description="Таймаут в секундах, после которого задача считается зависшей"
    )


# Определение задачи для автоматического обнаружения
TASK_DEFINITIONS = [("system:cleanup_zombie_tasks", CleanupZombieTasksParams, "tasks:cleanup")]
