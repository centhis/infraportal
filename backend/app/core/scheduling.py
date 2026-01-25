
import logging
from typing import Optional, Protocol, Any, Type
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

class SchedulerInterface(Protocol):
    def __init__(self, db: Session): ...
    
    def create_or_update_periodic_task(
        self,
        task_name: str,
        task_func: str,
        cron_schedule: str,
        kwargs: Optional[dict] = None,
        enabled: bool = True
    ) -> Any:
        ...

class SchedulerProxy:
    _impl_cls: Optional[Type[SchedulerInterface]] = None

    @classmethod
    def set_implementation(cls, impl_cls: Type[SchedulerInterface]):
        cls._impl_cls = impl_cls
        logger.info(f"Scheduler implementation registered: {impl_cls.__name__}")

    @classmethod
    def create_or_update_periodic_task(
        cls,
        db: Session,
        task_name: str,
        task_func: str,
        cron_schedule: str,
        kwargs: Optional[dict] = None,
        enabled: bool = True
    ):
        if cls._impl_cls:
            service = cls._impl_cls(db)
            return service.create_or_update_periodic_task(
                task_name=task_name,
                task_func=task_func,
                cron_schedule=cron_schedule,
                kwargs=kwargs,
                enabled=enabled
            )
        else:
            logger.warning(f"Scheduler implementation not yet registered. Task '{task_name}' skipped.")
            return None

scheduler = SchedulerProxy
