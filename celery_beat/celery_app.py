from celery import Celery
from config import settings

celery_app = Celery("celery_beat", broker=settings.REDIS_TASK_URL)
celery_app.config_from_object('config')
# Celery Beat не импортирует задачи, он получает их имена из БД.
# --- Monkeypatch for SQLAlchemy 2.0 compatibility ---
# celery-sqlalchemy-scheduler is not fully compatible with SQLAlchemy 2.0
# We need to patch the PeriodicTaskChanged model to use 2.0 syntax
# --- Monkeypatch for SQLAlchemy 2.0 compatibility ---
# celery-sqlalchemy-scheduler is not fully compatible with SQLAlchemy 2.0
# We need to patch the PeriodicTaskChanged model to use 2.0 syntax
from celery_sqlalchemy_scheduler import models
from sqlalchemy import select, insert, update, event
import datetime as dt

def update_changed_fixed(mapper, connection, target):
    """
    Fixed version of update_changed that uses select(Entity) instead of select([Entity])
    """
    stmt = select(models.PeriodicTaskChanged).where(models.PeriodicTaskChanged.id == 1).limit(1)
    s = connection.execute(stmt).first()
    if not s:
        stmt = insert(models.PeriodicTaskChanged).values(last_update=dt.datetime.now())
        connection.execute(stmt)
    else:
        stmt = update(models.PeriodicTaskChanged).\
            where(models.PeriodicTaskChanged.id == 1).\
            values(last_update=dt.datetime.now())
        connection.execute(stmt)

def changed_fixed(mapper, connection, target):
    if not getattr(target, 'no_changes', False):
        update_changed_fixed(mapper, connection, target)

# Re-register listeners with fixed function
# Iterate over all models that trigger PeriodicTaskChanged updates
for model in [models.PeriodicTask, models.IntervalSchedule, models.CrontabSchedule, models.SolarSchedule]:
    for evt in ['after_insert', 'after_delete', 'after_update']:
        try:
            # PeriodicTask has a specific 'changed' method usually used for 'after_update'
            # but in the library it might be registered as 'update_changed' or 'changed' depending on version.
            # We try to remove both common handlers just in case.
            
            if event.contains(model, evt, models.PeriodicTaskChanged.update_changed):
                event.remove(model, evt, models.PeriodicTaskChanged.update_changed)
            
            if hasattr(models.PeriodicTaskChanged, 'changed'):
                 if event.contains(model, evt, models.PeriodicTaskChanged.changed):
                     event.remove(model, evt, models.PeriodicTaskChanged.changed)

            # Re-add our fixed listener
            event.listen(model, evt, changed_fixed)
        except Exception as e:
            print(f"Warning: Failed to patch {model} {evt}: {e}")

# --- Monkeypatch for CrontabSchedule.from_schedule (ZoneInfo support) ---
# The library expects schedule.tz.zone, but ZoneInfo objects (Python 3.9+) use .key
def crontab_from_schedule_fixed(cls, session, schedule):
    spec = {
        'minute': schedule._orig_minute,
        'hour': schedule._orig_hour,
        'day_of_week': schedule._orig_day_of_week,
        'day_of_month': schedule._orig_day_of_month,
        'month_of_year': schedule._orig_month_of_year,
    }
    if schedule.tz:
        if hasattr(schedule.tz, 'zone'):
            spec.update({'timezone': schedule.tz.zone})
        elif hasattr(schedule.tz, 'key'):
            spec.update({'timezone': schedule.tz.key})
        else:
            spec.update({'timezone': str(schedule.tz)})
            
    model = session.query(models.CrontabSchedule).filter_by(**spec).first()
    if not model:
        model = cls(**spec)
        session.add(model)
        session.commit()
    return model

models.CrontabSchedule.from_schedule = classmethod(crontab_from_schedule_fixed)
# ------------------------------------------------------------------------
# ----------------------------------------------------

celery_app.conf.update(
    CELERY_TIMEZONE=settings.CELERY_TIMEZONE,
    beat_scheduler=settings.CELERY_BEAT_SCHEDULER,
    beat_dburi=settings.CELERY_BEAT_SCHEDULER_URL,
    # Backward compatibility if library checks old keys (though it shouldn't for internal logic)
    CELERY_BEAT_SCHEDULER=settings.CELERY_BEAT_SCHEDULER,
    CELERY_BEAT_SCHEDULER_URL=settings.CELERY_BEAT_SCHEDULER_URL,
)
