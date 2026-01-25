# backend/app/tasks/services.py
from typing import Dict, Any, List

from fastapi import Depends, HTTPException, status
from pydantic import ValidationError

from .registry import TASK_REGISTRY, TaskDefinition
from app.core.celery_client import celery_client
# from app.auth.dependencies import get_current_user, permission_checker # Зависимости для проверки прав
# from .models import TaskExecution # Будет создана на шаге 4.5
from .execution_service import TaskExecutionService

class TaskService:
    def __init__(
        self,
        # current_user: dict = Depends(get_current_user), # Пример зависимости
        # current_user: dict = Depends(get_current_user), # Пример зависимости
        execution_service: TaskExecutionService = Depends()
    ):
        # self.current_user = current_user
        self.execution_service = execution_service
        pass

    def get_all_tasks(self) -> Dict[str, TaskDefinition]:
        """Возвращает все зарегистрированные задачи."""
        return TASK_REGISTRY

    def run_task_by_name(self, task_name: str, params: Dict[str, Any], user_permissions: List[str], triggered_by: str) -> str:
        """
        Запускает задачу по ее имени, предварительно выполнив проверки.
        Возвращает ID выполнения задачи.
        """
        # 1. Find task in registry
        task_def = TASK_REGISTRY.get(task_name)
        if not task_def:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found.")

        # 2. Check permissions
        if task_def.permission:
            if task_def.permission not in user_permissions:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=f"Permission denied. Required: {task_def.permission}")

        # 3. Validate parameters
        try:
            validated_params = task_def.params_schema(**params)
        except ValidationError as e:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail={"msg": "Task parameter validation error", "errors": e.errors()}
            )

        # 4. Create execution record (to be uncommented)
        # 4. Create execution record
        # 4. Create execution record
        execution = self.execution_service.create_execution(
            task_name=task_name,
            params=validated_params.model_dump(),
            triggered_by=triggered_by
        )
        execution_id = str(execution.id)

        # 5. Send task to Celery
        celery_client.send_task(
            "tasks.dispatch", # Name of the universal dispatcher in celery_worker
            kwargs={
                "task_type": task_name,
                "execution_id": execution_id,
                # "params" will be extracted from `kwargs` in the worker itself
                **validated_params.model_dump()
            }
        )
        
        return execution_id
