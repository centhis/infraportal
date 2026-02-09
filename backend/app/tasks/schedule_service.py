import json
import logging

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.scheduling import PeriodicTaskInfo
from app.tasks.models import CrontabSchedule, PeriodicTask

logger = logging.getLogger(__name__)


class ScheduleService:
    def __init__(self, db: Session):
        self.db = db

    def get_periodic_task_info(self, task_name: str) -> PeriodicTaskInfo | None:
        """
        Получает информацию о периодической задаче.
        """
        stmt = select(PeriodicTask).where(PeriodicTask.name == task_name)
        task = self.db.execute(stmt).scalars().first()

        if not task:
            return None

        cron = task.crontab
        cron_str = (
            f"{cron.minute} {cron.hour} {cron.day_of_month} {cron.month_of_year} {cron.day_of_week}"
        )

        return {
            "id": task.id,
            "enabled": task.enabled,
            "cron_schedule": cron_str,
        }

    def create_or_update_periodic_task(
        self,
        task_name: str,
        task_func: str,
        cron_schedule: str,  # "0 0 * * *"
        kwargs: dict | None = None,
        enabled: bool = True,
    ) -> PeriodicTask:
        """
        Создает или обновляет периодическую задачу.
        Для простоты обновляем связанный crontab на месте.
        """
        if kwargs is None:
            kwargs = {}

        # 1. Парсим расписание
        minute, hour, day_of_month, month_of_year, day_of_week = "0", "0", "*", "*", "*"
        parts = cron_schedule.split()
        if len(parts) == 5:
            minute, hour, day_of_month, month_of_year, day_of_week = parts

        # 2. Находим задачу
        task = self.db.query(PeriodicTask).filter_by(name=task_name).first()

        if not task:
            logger.info(f"Creating periodic task: {task_name}")
            # Создаем новое расписание
            crontab = CrontabSchedule(
                minute=minute,
                hour=hour,
                day_of_month=day_of_month,
                month_of_year=month_of_year,
                day_of_week=day_of_week,
            )
            self.db.add(crontab)
            self.db.flush()

            # Создаем задачу
            task = PeriodicTask(
                name=task_name,
                task=task_func,
                crontab=crontab,
                kwargs=json.dumps(kwargs),
                enabled=enabled,
            )
            self.db.add(task)
        else:
            logger.info(f"Updating periodic task: {task_name}")
            # Обновляем существующий crontab задачи
            if not task.crontab:
                task.crontab = CrontabSchedule()
                self.db.add(task.crontab)

            task.crontab.minute = minute
            task.crontab.hour = hour
            task.crontab.day_of_month = day_of_month
            task.crontab.month_of_year = month_of_year
            task.crontab.day_of_week = day_of_week

            task.task = task_func
            task.kwargs = json.dumps(kwargs)
            task.enabled = enabled

        self.db.flush()
        return task
