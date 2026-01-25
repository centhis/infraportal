# backend/app/tasks/models.py
import enum
import uuid
from sqlalchemy import Column, String, DateTime, Enum, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from app.db.orm_base import Base

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
    status = Column(Enum(ExecutionStatus), default=ExecutionStatus.PENDING, nullable=False, index=True)
    
    params = Column(JSON, nullable=True)
    result = Column(JSON, nullable=True)
    
    triggered_by = Column(String, nullable=True, index=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    started_at = Column(DateTime(timezone=True), nullable=True)
    finished_at = Column(DateTime(timezone=True), nullable=True)
    heartbeat_at = Column(DateTime(timezone=True), nullable=True)

    def __repr__(self):
        return f"<TaskExecution(id={self.id}, task_type='{self.task_type}', status='{self.status}')>"

# Import scheduler models so that Alembic can see them
# These models are part of the celery-sqlalchemy-scheduler library and are
# used by the celery-beat service to store the schedule.
from celery_sqlalchemy_scheduler.models import (  # noqa: F401
    CrontabSchedule,
    IntervalSchedule,
    PeriodicTask,
    SolarSchedule,
)
