
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.tasks.schedule_service import ScheduleService
from app.tasks.models import CrontabSchedule
import json

def cleanup_tasks(db_session: Session):
    # Use raw SQL to bypass ORM incompatibilities with celery_sqlalchemy_scheduler models
    db_session.execute(text("DELETE FROM celery_periodic_task"))
    db_session.execute(text("DELETE FROM celery_crontab_schedule"))
    db_session.commit()

def test_create_periodic_task_creates_crontab(db_session: Session):
    service = ScheduleService(db_session)
    cleanup_tasks(db_session)
    
    task = service.create_or_update_periodic_task(
        task_name="test_task",
        task_func="tasks.test",
        cron_schedule="0 0 * * *",
        kwargs={"foo": "bar"}
    )
    
    assert task.name == "test_task"
    assert task.task == "tasks.test"
    assert json.loads(task.kwargs) == {"foo": "bar"}
    
    # Verify crontab created
    crontab = db_session.query(CrontabSchedule).first()
    assert crontab is not None
    assert crontab.minute == "0"
    assert crontab.hour == "0"
    assert task.crontab_id == crontab.id

def test_create_periodic_task_uses_existing_crontab(db_session: Session):
    service = ScheduleService(db_session)
    cleanup_tasks(db_session)
    
    # Create first task
    t1 = service.create_or_update_periodic_task("t1", "f", "0 0 * * *")
    
    # Create second task with SAME schedule
    t2 = service.create_or_update_periodic_task("t2", "f", "0 0 * * *")
    
    # Should reuse crontab
    assert t1.crontab_id == t2.crontab_id
    assert db_session.query(CrontabSchedule).count() == 1

def test_update_periodic_task(db_session: Session):
    service = ScheduleService(db_session)
    cleanup_tasks(db_session)
    
    # Create
    t1 = service.create_or_update_periodic_task("t11", "f", "0 0 * * *", enabled=True)
    assert t1.enabled is True
    
    # Update disabled
    t2 = service.create_or_update_periodic_task("t11", "f", "0 0 * * *", enabled=False)
    
    assert t2.id == t1.id
    assert t2.enabled is False
    
    # Verify DB state
    db_session.refresh(t1)
    assert t1.enabled is False

def test_update_periodic_task_kwargs(db_session: Session):
    service = ScheduleService(db_session)
    cleanup_tasks(db_session)
    
    # Create
    service.create_or_update_periodic_task("t_kwargs", "f", "0 0 * * *", kwargs={"a": 1})
    
    # Update kwargs
    task = service.create_or_update_periodic_task("t_kwargs", "f", "0 0 * * *", kwargs={"a": 2})
    
    assert json.loads(task.kwargs) == {"a": 2}

