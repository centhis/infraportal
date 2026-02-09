import datetime as dt
import enum
import uuid

from celery_sqlalchemy_scheduler.models import (
    CrontabSchedule,
    IntervalSchedule,
    PeriodicTask,
    PeriodicTaskChanged,
    SolarSchedule,
)
from sqlalchemy import ARRAY, JSON, Column, DateTime, Enum, String, event, insert, select, update
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from app.db.orm_base import Base


class TaskDefinitionModel(Base):
    """Метаданные задач в БД."""

    __tablename__ = "task_definitions"

    name = Column(String, primary_key=True)  # Пример: "users:sync_ldap"
    display_name = Column(String, nullable=False)
    category = Column(String, nullable=False)
    permission = Column(String, nullable=True)
    params_schema = Column(JSON, nullable=True)
    secrets = Column(ARRAY(String), default=[])
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class ExecutionStatus(str, enum.Enum):
    PENDING = "PENDING"
    IN_PROGRESS = "IN_PROGRESS"
    SUCCESS = "SUCCESS"
    FAILURE = "FAILURE"
    RETRY = "RETRY"
    REVOKED = "REVOKED"


class TaskExecution(Base):
    __tablename__ = "task_executions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    task_type = Column(String, nullable=False, index=True)
    status = Column(
        Enum(ExecutionStatus), default=ExecutionStatus.PENDING, nullable=False, index=True
    )

    params = Column(JSON, nullable=True)
    result = Column(JSON, nullable=True)

    triggered_by = Column(String, nullable=True, index=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    started_at = Column(DateTime(timezone=True), nullable=True)
    finished_at = Column(DateTime(timezone=True), nullable=True)
    heartbeat_at = Column(DateTime(timezone=True), nullable=True)

    def __repr__(self):
        return (
            f"<TaskExecution(id={self.id}, task_type='{self.task_type}', status='{self.status}')>"
        )


# Импортировать модели планировщика, чтобы Alembic мог их видеть
# Эти модели являются частью библиотеки celery-sqlalchemy-scheduler и
# используются сервисом celery-beat для хранения расписания.


# Патч celery-sqlalchemy-scheduler для совместимости с SQLAlchemy 2.0
def update_changed_fixed(mapper, connection, target):
    """
    Исправленная версия update_changed, которая использует select(Entity) вместо select([Entity])
    """
    s = connection.execute(select(PeriodicTaskChanged).where(PeriodicTaskChanged.id == 1).limit(1))
    if not s.first():
        connection.execute(insert(PeriodicTaskChanged).values(last_update=dt.datetime.now()))
    else:
        connection.execute(
            update(PeriodicTaskChanged)
            .where(PeriodicTaskChanged.id == 1)
            .values(last_update=dt.datetime.now())
        )


def changed_fixed(mapper, connection, target):
    if not getattr(target, "no_changes", False):
        update_changed_fixed(mapper, connection, target)


# Перерегистрация слушателей с исправленной функцией
for model in [PeriodicTask, IntervalSchedule, CrontabSchedule, SolarSchedule]:
    for evt in ["after_insert", "after_delete", "after_update"]:
        try:
            if model is PeriodicTask and evt == "after_update":
                target_fn = PeriodicTaskChanged.changed
                new_fn = changed_fixed
            else:
                target_fn = PeriodicTaskChanged.update_changed
                new_fn = update_changed_fixed

            if event.contains(model, evt, target_fn):
                event.remove(model, evt, target_fn)
                event.listen(model, evt, new_fn)
        except Exception:
            pass
