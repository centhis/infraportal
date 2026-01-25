
import json
import logging
from typing import Optional
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.tasks.models import PeriodicTask, CrontabSchedule

logger = logging.getLogger(__name__)

class ScheduleService:
    def __init__(self, db: Session):
        self.db = db

    def create_or_update_periodic_task(
        self,
        task_name: str,
        task_func: str,
        cron_schedule: str, # "0 0 * * *"
        kwargs: Optional[dict] = None,
        enabled: bool = True
    ) -> PeriodicTask:
        """
        Creates or updates a periodic task with a Crontab schedule.
        """
        if kwargs is None:
            kwargs = {}
            
        # 1. Parse/Create Crontab
        minute, hour, day_of_month, month_of_year, day_of_week = "*", "*", "*", "*", "*"
        try:
            parts = cron_schedule.split()
            if len(parts) == 5:
                minute, hour, day_of_month, month_of_year, day_of_week = parts
        except Exception:
             logger.warning(f"Invalid cron format: {cron_schedule}. Fallback to defaults.")


        # Modern select syntax using __table__ to bypass legacy ORM issues
        stmt = select(CrontabSchedule.__table__).filter_by(
            minute=minute,
            hour=hour,
            day_of_month=day_of_month,
            month_of_year=month_of_year,
            day_of_week=day_of_week
        )
        crontab_row = self.db.execute(stmt).first()
        crontab = None
        if crontab_row:
             # Use modern Session.get()
             crontab = self.db.get(CrontabSchedule, crontab_row.id)

        if not crontab:
            crontab = CrontabSchedule(
                minute=minute,
                hour=hour,
                day_of_month=day_of_month,
                month_of_year=month_of_year,
                day_of_week=day_of_week
            )
            self.db.add(crontab)
            self.db.commit()
            self.db.refresh(crontab)
            
        # 2. Create/Update Task
        # Use __table__ to find by name, then get by ID if needed
        stmt_task = select(PeriodicTask.__table__).filter(PeriodicTask.name == task_name)
        existing_task_row = self.db.execute(stmt_task).first()
        existing_task = None
        if existing_task_row:
            existing_task = self.db.get(PeriodicTask, existing_task_row.id)
        
        if not existing_task:
            logger.info(f"Creating periodic task: {task_name}")
            new_task = PeriodicTask(
                name=task_name,
                task=task_func,
                crontab=crontab,
                kwargs=json.dumps(kwargs),
                enabled=enabled
            )
            self.db.add(new_task)
            self.db.commit()
            return new_task
        else:
            updated = False
            if existing_task.crontab != crontab:
                existing_task.crontab = crontab
                updated = True
            
            if existing_task.enabled != enabled:
                existing_task.enabled = enabled
                updated = True
                
            new_kwargs = json.dumps(kwargs)
            if existing_task.kwargs != new_kwargs:
                existing_task.kwargs = new_kwargs
                updated = True
                
            # Check kwargs update if needed?
            # Ideally yes, but skipping for brevity unless critical
            
            if updated:
                logger.info(f"Updating periodic task: {task_name}")
                self.db.commit()
            
            return existing_task
