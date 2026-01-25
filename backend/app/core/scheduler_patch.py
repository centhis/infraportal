
import logging
import datetime
from sqlalchemy import select
from celery_sqlalchemy_scheduler import models

logger = logging.getLogger(__name__)

def apply_patches():
    """
    Monkey-patches celery-sqlalchemy-scheduler to work with SQLAlchemy 2.0.
    """
    try:
        # Checking if we can patch the model class method?
        if hasattr(models.PeriodicTaskChanged, 'update_changed'):
            
            # Use a plain function instead of @classmethod inside closure
            def patched_update_changed(mapper, connection, target):
                """
                Patched version of update_changed that uses SA 2.0 select syntax.
                """
                
                # Use current UTC time for last_update, matching original logic behavior (simplified)
                # Original lib used dt.datetime.now()
                now = datetime.datetime.now(datetime.timezone.utc)
                
                # Simplified SA 2.0 compatible logic:
                # 1. Check if row exists.
                # 2. Update it.
                # 3. If not exists, insert it.
                
                stmt = select(models.PeriodicTaskChanged).limit(1)
                result = connection.execute(stmt).first()
                
                if not result:
                     # Insert
                     connection.execute(
                         models.PeriodicTaskChanged.__table__.insert().values(id=1, last_update=now)
                     )
                else:
                     # Update
                     connection.execute(
                         models.PeriodicTaskChanged.__table__.update().where(models.PeriodicTaskChanged.id == 1).values(last_update=now)
                     )

            # --- Critical Step: Unhook and Rehook Events ---
            from sqlalchemy import event
            from celery_sqlalchemy_scheduler.models import PeriodicTask, IntervalSchedule, CrontabSchedule, SolarSchedule

            # List of models and events where update_changed is registered
            targets = [
                (PeriodicTask, 'after_insert'),
                (PeriodicTask, 'after_delete'),
                (IntervalSchedule, 'after_insert'),
                (IntervalSchedule, 'after_delete'),
                (IntervalSchedule, 'after_update'),
                (CrontabSchedule, 'after_insert'),
                (CrontabSchedule, 'after_delete'),
                (CrontabSchedule, 'after_update'),
                (SolarSchedule, 'after_insert'),
                (SolarSchedule, 'after_delete'),
                (SolarSchedule, 'after_update'),
            ]

            original_method = models.PeriodicTaskChanged.update_changed

            for model_cls, event_name in targets:
                if event.contains(model_cls, event_name, original_method):
                    event.remove(model_cls, event_name, original_method)
                    event.listen(model_cls, event_name, patched_update_changed)
                    logger.debug(f"Replaced listener for {model_cls.__name__}.{event_name}")

            # Also replace the class method on PeriodicTaskChanged
            # Use staticmethod to avoid 'cls' argument injection when called via cls.update_changed
            models.PeriodicTaskChanged.update_changed = staticmethod(patched_update_changed)
            
            logger.info("Successfully patched celery-sqlalchemy-scheduler events for SQLAlchemy 2.0 compatibility.")
            
    except Exception as e:
        logger.error(f"Failed to patch celery-sqlalchemy-scheduler: {e}", exc_info=True)

