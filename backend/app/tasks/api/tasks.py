from typing import Any
from uuid import UUID

from fastapi import APIRouter, Body, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth.dependencies import (
    CurrentUser,
    get_current_user,
    get_current_user_permissions,
    permission_checker,
)
from app.db.database import get_db
from app.tasks.schemas import WorkerHealthResponseSchema
from app.tasks.services import TaskExecutionService, TaskService

router = APIRouter(tags=["Tasks"])

# --- Управление задачами ---


@router.get(
    "/tasks/workers/health",
    response_model=WorkerHealthResponseSchema,
    dependencies=[Depends(get_current_user)],
)
async def get_workers_health(task_service: TaskService = Depends()):
    """
    Возвращает состояние воркеров Celery.
    """
    return await task_service.get_workers_health()


@router.get(
    "/tasks",
    response_model=dict[str, Any],
    dependencies=[Depends(permission_checker(["tasks:read"]))],
)
def get_available_tasks(task_service: TaskService = Depends()):
    """
    Возвращает список всех доступных для запуска фоновых задач.
    """
    tasks = task_service.get_all_tasks()
    return {
        name: {
            "name": definition.name,
            "permission": definition.permission,
            "params_schema": definition.params_schema.model_json_schema(),
        }
        for name, definition in tasks.items()
    }


@router.post("/tasks/{task_name}/run", status_code=202)
def run_task(
    task_name: str,
    params: dict[str, Any] = Body(..., embed=True),
    current_user: CurrentUser = Depends(get_current_user),
    user_permissions: list[str] = Depends(get_current_user_permissions),
    task_service: TaskService = Depends(),
    db: Session = Depends(get_db),
):
    """
    Универсальный эндпоинт для запуска любой фоновой задачи по ее имени.
    """
    execution_id = task_service.run_task_by_name(
        task_name=task_name,
        params=params,
        user_permissions=user_permissions,
        triggered_by=current_user.login,
        db=db,
    )
    return {"message": "Task accepted for processing.", "execution_id": execution_id}


# --- Выполнения задач ---


@router.get("/task_executions", dependencies=[Depends(permission_checker(["tasks:read"]))])
def list_task_executions(
    limit: int = 50, offset: int = 0, execution_service: TaskExecutionService = Depends()
):
    """
    Получает список прошлых и текущих выполнений задач.
    """
    return execution_service.list_executions(limit=limit, offset=offset)


@router.get(
    "/task_executions/{execution_id}", dependencies=[Depends(permission_checker(["tasks:read"]))]
)
def get_task_execution(execution_id: UUID, execution_service: TaskExecutionService = Depends()):
    """
    Получает детальный статус конкретного выполнения задачи.
    """
    execution = execution_service.get_execution(execution_id)
    if not execution:
        raise HTTPException(status_code=404, detail="Task execution not found")
    return execution
