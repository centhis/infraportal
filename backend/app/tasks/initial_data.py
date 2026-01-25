
import logging
import json
from sqlalchemy.orm import Session
from app.tasks.models import PeriodicTask, IntervalSchedule, CrontabSchedule
from app.core.config import settings

logger = logging.getLogger(__name__)

def init_data(db: Session):
    """
    Initializes default periodic tasks (e.g., zombie cleanup).
    """
    # 1. Ensure IntervalSchedule exists (e.g., every 5 minutes)
    # Note: TASK_TIMEOUT is in seconds, we want the schedule to run roughly at that frequency or slightly more often.
    # Let's run it every 5 minutes (300s).
    
    interval_seconds = settings.TASK_TIMEOUT if settings.TASK_TIMEOUT > 0 else 300
    
    schedule = db.query(IntervalSchedule).filter_by(every=interval_seconds, period=IntervalSchedule.SECONDS).first()
    if not schedule:
        logger.info(f"Creating IntervalSchedule for {interval_seconds} seconds")
        schedule = IntervalSchedule(every=interval_seconds, period=IntervalSchedule.SECONDS)
        db.add(schedule)
        db.commit()
        db.refresh(schedule)

    # 2. Ensure System Cleanup Task exists
    task_name = "System: Cleanup Zombie Tasks"
    task_key = "system:cleanup_zombie_tasks" 
    
    # Note: The actual task delivered to worker is "tasks.dispatch", 
    # with kwargs={"task_type": "system:cleanup_zombie_tasks", "timeout_seconds": ...}
    
    existing_task = db.query(PeriodicTask).filter(PeriodicTask.name == task_name).first()
    
    if not existing_task:
        logger.info(f"Creating periodic task: {task_name}")
        new_task = PeriodicTask(
            name=task_name,
            task="tasks.dispatch", # The universal dispatcher
            interval=schedule,
            kwargs=json.dumps({
                "task_type": task_key,
                "timeout_seconds": settings.TASK_TIMEOUT
            }),
            enabled=True
        )
        db.add(new_task)
        db.commit()
    else:
        # Update connection settings if needed? 
        # For now, we assume if it exists, it's fine.
        pass

    # --- LDAP Sync Schedule Setup ---
    # Parse Cron Schedule
    schedule_str = settings.LDAP_SYNC_SCHEDULE # e.g. "0 0 * * *"
    
    minute="0"
    hour="0"
    day_of_month="*"
    month_of_year="*"
    day_of_week="*"

    try:
        parts = schedule_str.split()
        if len(parts) == 5:
            minute, hour, day_of_month, month_of_year, day_of_week = parts
    except Exception:
        logger.warning(f"Invalid LDAP_SYNC_SCHEDULE format: {schedule_str}. Using default daily.")

    # 1. Ensure CrontabSchedule exists
    crontab = db.query(CrontabSchedule).filter_by(
        minute=minute,
        hour=hour,
        day_of_month=day_of_month,
        month_of_year=month_of_year,
        day_of_week=day_of_week
    ).first()

    if not crontab:
        logger.info(f"Creating CrontabSchedule for LDAP Sync: {schedule_str}")
        crontab = CrontabSchedule(
            minute=minute,
            hour=hour,
            day_of_month=day_of_month,
            month_of_year=month_of_year,
            day_of_week=day_of_week
        )
        db.add(crontab)
        db.commit()
        db.refresh(crontab)

    # 2. Create/Update PeriodicTask
    task_name = "Users: LDAP Sync"
    task_key = "users:sync_ldap"

    # We read LDAP_ENABLED directly from config settings (initialized from .env or override)
    ldap_enabled = str(settings.LDAP_ENABLED).lower() == "true"
    
    existing_task = db.query(PeriodicTask).filter(PeriodicTask.name == task_name).first()

    if not existing_task:
        logger.info(f"Creating periodic task: {task_name}")
        new_task = PeriodicTask(
            name=task_name,
            task="tasks.dispatch", # Universal dispatcher
            crontab=crontab,
            kwargs=json.dumps({
                "task_type": task_key
            }),
            enabled=ldap_enabled
        )
        db.add(new_task)
    else:
        # Update schedule if changed
        if existing_task.crontab != crontab:
             existing_task.crontab = crontab
        
        # Enforce enabled status based on global config
        if existing_task.enabled != ldap_enabled:
             logger.info(f"Updating {task_name} enabled status to {ldap_enabled}")
             existing_task.enabled = ldap_enabled
    
    db.commit()
