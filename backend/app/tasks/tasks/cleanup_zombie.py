from sqlalchemy.orm import Session

from app.core.task_contract import TaskDefinition
from app.tasks.execution_service import TaskExecutionService
from app.tasks.schemas import CleanupZombieParams


def result_handler(result: dict, db: Session) -> dict:
    """
    Обрабатывает результат очистки зомби-задач.
    Использует TaskExecutionService для пакетного обновления статусов.
    """
    terminated_ids = result.get("terminated_ids", [])
    processed_count = 0

    if terminated_ids:
        service = TaskExecutionService(db)
        processed_count = service.fail_multiple_executions(
            execution_ids=terminated_ids, error_reason="Task hung (timeout) or worker lost"
        )

    return {
        "summary": f"Успешно обработано {processed_count} задач",
        "terminated_ids": terminated_ids,
    }


TASK = TaskDefinition(
    name="system:cleanup_zombie_tasks",
    display_name="Очистка зависших задач",
    category="tasks",
    permission="tasks:cleanup",
    secrets=[],
    params_schema=CleanupZombieParams,
    result_handler=result_handler,
)
