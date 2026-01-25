from typing import Dict, Any, List
from uuid import UUID

from fastapi import APIRouter, Depends, Body, HTTPException
from app.tasks.services import TaskService, TaskExecutionService
from app.auth.dependencies import get_current_user, permission_checker, get_current_user_permissions
from app.users.models import User

router = APIRouter(tags=["Tasks"])

# --- Tasks Management ---

@router.get("/tasks", response_model=Dict[str, Any], dependencies=[Depends(permission_checker(["tasks:read"]))])
def get_available_tasks(
    task_service: TaskService = Depends()
):
    """
    Возвращает список всех доступных для запуска фоновых задач.
    """
    tasks = task_service.get_all_tasks()
    return {
        name: {
            "name": definition.name,
            "permission": definition.permission,
            "params_schema": definition.params_schema.model_json_schema()
        }
        for name, definition in tasks.items()
    }

@router.post("/tasks/{task_name}/run", status_code=202)
def run_task(
    task_name: str,
    params: Dict[str, Any] = Body(..., embed=True),
    current_user: User = Depends(get_current_user),
    user_permissions: List[str] = Depends(get_current_user_permissions),
    task_service: TaskService = Depends()
):
    """
    Универсальный эндпоинт для запуска любой фоновой задачи по ее имени.
    """
    execution_id = task_service.run_task_by_name(
        task_name=task_name,
        params=params,
        user_permissions=user_permissions,
        triggered_by=current_user.login
    )
    return {"message": "Task accepted for processing.", "execution_id": execution_id}

# --- Task Executions ---

@router.get("/task_executions", dependencies=[Depends(permission_checker(["tasks:read"]))])
def list_task_executions(
    limit: int = 50,
    offset: int = 0,
    execution_service: TaskExecutionService = Depends()
):
    """
    Get a list of past and current task executions.
    """
    return execution_service.list_executions(limit=limit, offset=offset)

@router.get("/task_executions/{execution_id}", dependencies=[Depends(permission_checker(["tasks:read"]))])
def get_task_execution(
    execution_id: UUID,
    execution_service: TaskExecutionService = Depends()
):
    """
    Get detailed status of a specific task execution.
    """
    execution = execution_service.get_execution(execution_id)
    if not execution:
        raise HTTPException(status_code=404, detail="Task execution not found")
    return execution
