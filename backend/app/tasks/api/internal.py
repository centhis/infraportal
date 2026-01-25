from typing import Dict, Any, Optional, List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Body, Query

from app.tasks.services import TaskExecutionService
from app.tasks.models import ExecutionStatus
from app.auth.dependencies import get_worker_api_key

router = APIRouter(tags=["Internal Tasks"])

@router.patch("/tasks/{execution_id}", dependencies=[Depends(get_worker_api_key)])
def update_task_execution(
    execution_id: UUID,
    status: Optional[ExecutionStatus] = Body(None),
    result: Optional[Dict[str, Any]] = Body(None),
    heartbeat: bool = Body(False),
    execution_service: TaskExecutionService = Depends()
):
    """
    Internal endpoint for Celery workers to update task status or send heartbeats.
    Protected by worker API key.
    """
    if heartbeat:
        return execution_service.update_heartbeat(execution_id)
    
    if status:
        return execution_service.update_status(execution_id, status, result)
        
    raise HTTPException(status_code=400, detail="No updates provided")


@router.get("/tasks/stale", dependencies=[Depends(get_worker_api_key)])
def get_stale_tasks(
    timeout_seconds: int = Query(300),
    execution_service: TaskExecutionService = Depends()
) -> List[UUID]:
    """
    Returns IDs of tasks that haven't sent a heartbeat for > timeout_seconds.
    Used by the system:cleanup_zombie_tasks task.
    """
    stale_tasks = execution_service.get_stale_executions(timeout_seconds)
    return [t.id for t in stale_tasks]
