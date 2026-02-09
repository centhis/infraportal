import inspect
import json
import logging

from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.task_collector import collect_all_tasks
from app.tasks.models import IntervalSchedule, PeriodicTask, TaskDefinitionModel

logger = logging.getLogger(__name__)


def sync_task_definitions(db: Session):
    """Синхронизирует определения задач из кода в БД."""
    for task in collect_all_tasks():
        # Если params_schema - это класс Pydantic, конвертируем его в JSON Schema
        params_schema = task.params_schema
        if inspect.isclass(task.params_schema) and issubclass(task.params_schema, BaseModel):
            params_schema = task.params_schema.model_json_schema()

        existing = db.query(TaskDefinitionModel).filter_by(name=task.name).first()
        if existing:
            existing.display_name = task.display_name
            existing.category = task.category
            existing.permission = task.permission
            existing.secrets = task.secrets
            existing.params_schema = params_schema
        else:
            db.add(
                TaskDefinitionModel(
                    name=task.name,
                    display_name=task.display_name,
                    category=task.category,
                    permission=task.permission,
                    secrets=task.secrets,
                    params_schema=params_schema,
                )
            )
    db.commit()


def init_data(db: Session):
    """
    Инициализирует периодические задачи по умолчанию.
    Также синхронизирует определения задач.
    """
    sync_task_definitions(db)

    # 1. Убедиться, что IntervalSchedule существует (например, каждые 5 минут)
    # Примечание: TASK_TIMEOUT в секундах, мы хотим, чтобы расписание запускалось примерно с такой частотой или немного чаще.
    # Запустим его каждые 5 минут (300с).

    interval_seconds = settings.TASK_TIMEOUT if settings.TASK_TIMEOUT > 0 else 300

    schedule = (
        db.query(IntervalSchedule)
        .filter_by(every=interval_seconds, period=IntervalSchedule.SECONDS)
        .first()
    )
    if not schedule:
        logger.info(f"Creating IntervalSchedule for {interval_seconds} seconds")
        schedule = IntervalSchedule(every=interval_seconds, period=IntervalSchedule.SECONDS)
        db.add(schedule)
        db.commit()
        db.refresh(schedule)

    # 2. Убедиться, что задача системной очистки существует
    task_name = "System: Cleanup Zombie Tasks"
    task_key = "system:cleanup_zombie_tasks"

    # Примечание: Фактическая задача, доставляемая воркеру, это "tasks.dispatch",
    # с kwargs={"task_type": "system:cleanup_zombie_tasks", "timeout_seconds": ...}

    kwargs_json = json.dumps(
        {"task_type": task_key, "timeout_seconds": settings.TASK_TIMEOUT, "schedule_id": task_name}
    )

    existing_task = db.query(PeriodicTask).filter(PeriodicTask.name == task_name).first()

    if not existing_task:
        logger.info(f"Creating periodic task: {task_name}")
        new_task = PeriodicTask(
            name=task_name,
            task="tasks.dispatch",  # Универсальный диспетчер
            interval=schedule,
            kwargs=kwargs_json,
            enabled=True,
        )
        db.add(new_task)
        db.commit()
    else:
        logger.info(f"Updating existing periodic task: {task_name}")
        existing_task.kwargs = kwargs_json
        existing_task.task = "tasks.dispatch"
        db.add(existing_task)
        db.commit()

    db.commit()
