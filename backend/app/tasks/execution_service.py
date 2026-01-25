from typing import Dict, Any, Optional, List
from uuid import UUID
from datetime import datetime, timedelta
import pytz

from fastapi import HTTPException, status
from sqlalchemy import desc

from app.db.database import db_dependency
from .models import TaskExecution, ExecutionStatus

class TaskExecutionService:
    def __init__(self, db: db_dependency):
        self.db = db

    def create_execution(
        self, 
        task_name: str, 
        params: Optional[Dict[str, Any]] = None,
        triggered_by: str = "system"
    ) -> TaskExecution:
        """
        Creates a new task execution record in PENDING state.
        """
        execution = TaskExecution(
            task_type=task_name,
            params=params,
            status=ExecutionStatus.PENDING,
            triggered_by=triggered_by
        )
        self.db.add(execution)
        self.db.commit()
        self.db.refresh(execution)
        return execution

    def get_execution(self, execution_id: UUID) -> Optional[TaskExecution]:
        """
        Retrieves a task execution by ID.
        """
        return self.db.query(TaskExecution).filter(TaskExecution.id == execution_id).first()

    def get_stale_executions(self, timeout_seconds: int = 300) -> List[TaskExecution]:
        """
        Returns a list of tasks stuck in IN_PROGRESS state with no heartbeat for > timeout_seconds.
        Does not modify their status.
        """
        cutoff_time = datetime.now(pytz.utc) - timedelta(seconds=timeout_seconds)
        
        return (
            self.db.query(TaskExecution)
            .filter(
                TaskExecution.status == ExecutionStatus.IN_PROGRESS,
                TaskExecution.heartbeat_at < cutoff_time
            )
            .all()
        )

    def list_executions(self, limit: int = 50, offset: int = 0) -> List[TaskExecution]:
        """
        Retrieves a list of task executions, ordered by creation time (desc).
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
        Updates the heartbeat timestamp for a running task.
        """
        execution = self.get_execution(execution_id)
        if not execution:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Execution not found")
        
        execution.heartbeat_at = datetime.now(pytz.utc)
        execution.status = ExecutionStatus.IN_PROGRESS # Ensure status is IN_PROGRESS
        
        self.db.commit()
        self.db.refresh(execution)
        return execution

    def update_status(
        self, 
        execution_id: UUID, 
        status: ExecutionStatus, 
        result: Optional[Dict[str, Any]] = None
    ) -> TaskExecution:
        """
        Updates the status and result of a task execution.
        """
        execution = self.get_execution(execution_id)
        if not execution:
            raise HTTPException(status_code=404, detail="Execution not found")

        execution.status = status
        if result is not None:
            # Append to existing result if needed, or overwrite. 
            # For now, simplistic overwrite or merge could be debated.
            # Let's overwrite for simplicity as workers usually send final result.
            execution.result = result
            
        if status == ExecutionStatus.IN_PROGRESS and not execution.started_at:
            execution.started_at = datetime.now(pytz.utc)
            
        if status in [ExecutionStatus.SUCCESS, ExecutionStatus.FAILURE, ExecutionStatus.REVOKED]:
            execution.finished_at = datetime.now(pytz.utc)

        self.db.commit()
        self.db.refresh(execution)
        return execution
