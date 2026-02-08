import logging
from typing import Any, Protocol, TypedDict

from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)


class PeriodicTaskInfo(TypedDict):
    id: int
    enabled: bool
    cron_schedule: str


class SchedulerInterface(Protocol):
    def __init__(self, db: Session): ...

    def create_or_update_periodic_task(
        self,
        task_name: str,
        task_func: str,
        cron_schedule: str,
        kwargs: dict | None = None,
        enabled: bool = True,
    ) -> Any: ...

    def get_periodic_task_info(self, task_name: str) -> PeriodicTaskInfo | None:
        ...


class SchedulerProxy:
    _impl_cls: type[SchedulerInterface] | None = None

    @classmethod
    def set_implementation(cls, impl_cls: type[SchedulerInterface]):
        cls._impl_cls = impl_cls
        logger.info(f"Scheduler implementation registered: {impl_cls.__name__}")

    @classmethod
    def create_or_update_periodic_task(
        cls,
        db: Session,
        task_name: str,
        task_func: str,
        cron_schedule: str,
        kwargs: dict | None = None,
        enabled: bool = True,
    ):
        if cls._impl_cls:
            service = cls._impl_cls(db)
            return service.create_or_update_periodic_task(
                task_name=task_name,
                task_func=task_func,
                cron_schedule=cron_schedule,
                kwargs=kwargs,
                enabled=enabled,
            )
        else:
            logger.warning(
                f"Scheduler implementation not yet registered. Task '{task_name}' skipped."
            )
            return None

    @classmethod
    def get_periodic_task_info(cls, db: Session, task_name: str) -> PeriodicTaskInfo | None:
        if cls._impl_cls:
            service = cls._impl_cls(db)
            return service.get_periodic_task_info(task_name=task_name)
        else:
            logger.warning(
                f"Scheduler implementation not yet registered. Query for '{task_name}' skipped."
            )
            return None


scheduler = SchedulerProxy
