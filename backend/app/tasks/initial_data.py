import json
import logging

from sqlalchemy.orm import Session

from app.core.config import settings
from app.tasks.models import CrontabSchedule, IntervalSchedule, PeriodicTask

logger = logging.getLogger(__name__)


def init_data(db: Session):
    """
    Инициализирует периодические задачи по умолчанию (например, очистка зомби-процессов).
    """
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

    kwargs_json = json.dumps({
        "task_type": task_key,
        "timeout_seconds": settings.TASK_TIMEOUT,
        "schedule_id": task_name
    })

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
