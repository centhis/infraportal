from datetime import datetime, timedelta
from typing import Any
from uuid import UUID

import pytz
from fastapi import HTTPException, status
from sqlalchemy import desc

from app.db.database import db_dependency

from .models import ExecutionStatus, TaskExecution


class TaskExecutionService:
    def __init__(self, db: db_dependency):
        self.db = db

    def create_execution(
        self, task_name: str, params: dict[str, Any] | None = None, triggered_by: str = "system"
    ) -> TaskExecution:
        """
        Создает новую запись о выполнении задачи в статусе PENDING.
        """
        execution = TaskExecution(
            task_type=task_name,
            params=params,
            status=ExecutionStatus.PENDING,
            triggered_by=triggered_by,
        )
        self.db.add(execution)
        self.db.commit()
        self.db.refresh(execution)
        return execution

    def get_execution(self, execution_id: UUID) -> TaskExecution | None:
        """
        Получает выполнение задачи по ID.
        """
        return self.db.query(TaskExecution).filter(TaskExecution.id == execution_id).first()

    def get_stale_executions(self, timeout_seconds: int = 300) -> list[TaskExecution]:
        """
        Возвращает список задач, зависших в статусе IN_PROGRESS без сердцебиения дольше timeout_seconds.
        Не изменяет их статус.
        """
        cutoff_time = datetime.now(pytz.utc) - timedelta(seconds=timeout_seconds)

        return (
            self.db.query(TaskExecution)
            .filter(
                TaskExecution.status == ExecutionStatus.IN_PROGRESS,
                TaskExecution.heartbeat_at < cutoff_time,
            )
            .all()
        )

    def list_executions(self, limit: int = 50, offset: int = 0) -> list[TaskExecution]:
        """
        Получает список выполнений задач, отсортированный по времени создания (по убыванию).
        """
        return (
            self.db.query(TaskExecution)
            .order_by(desc(TaskExecution.created_at))
            .limit(limit)
            .offset(offset)
            .all()
        )

    def update_heartbeat(self, execution_id: UUID) -> TaskExecution:
        """
        Обновляет метку времени сердцебиения для запущенной задачи.
        """
        execution = self.get_execution(execution_id)
        if not execution:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Execution not found")

        execution.heartbeat_at = datetime.now(pytz.utc)
        execution.status = ExecutionStatus.IN_PROGRESS  # Убедиться, что статус IN_PROGRESS

        self.db.commit()
        self.db.refresh(execution)
        return execution

    def update_status(
        self, execution_id: UUID, status: ExecutionStatus, result: dict[str, Any] | None = None
    ) -> TaskExecution:
        """
        Обновляет статус и результат выполнения задачи.
        """
        execution = self.get_execution(execution_id)
        if not execution:
            raise HTTPException(status_code=404, detail="Execution not found")

        execution.status = status
        if result is not None:
            # Добавить к существующему результату, если нужно, или перезаписать.
            # Пока можно обсудить упрощенную перезапись или слияние.
            # Давайте перезапишем для простоты, так как воркеры обычно отправляют окончательный результат.
            execution.result = result

        if status == ExecutionStatus.IN_PROGRESS and not execution.started_at:
            execution.started_at = datetime.now(pytz.utc)

        if status in [ExecutionStatus.SUCCESS, ExecutionStatus.FAILURE, ExecutionStatus.REVOKED]:
            execution.finished_at = datetime.now(pytz.utc)

        self.db.commit()
        self.db.refresh(execution)
        return execution
