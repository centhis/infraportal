from typing import Any
from fastapi import Depends, HTTPException, status
from pydantic import ValidationError
import httpx
from sqlalchemy.orm import Session
import logging

from app.core.celery_client import celery_client
from app.core.config import settings
from .execution_service import TaskExecutionService
from .registry import TASK_REGISTRY, TaskDefinition
from .schemas import WorkerHealthResponseSchema, WorkerStatsSchema

logger = logging.getLogger(__name__)

class TaskService:
    def __init__(
        self,
        execution_service: TaskExecutionService = Depends(),
    ):
        self.execution_service = execution_service
        self.http_client = httpx.AsyncClient(timeout=5.0)

    async def get_workers_health(self) -> WorkerHealthResponseSchema:
        """
        Получает информацию о состоянии воркеров через Flower API.
        """
        try:
            url = f"{settings.FLOWER_API_URL}/api/workers"
            # Explicitly request a refresh to ensure we get the latest worker status
            # This fixes an issue where Flower might return an empty list if it hasn't polled recently
            response = await self.http_client.get(url, params={"refresh": True})
            response.raise_for_status()
            
            workers = response.json()
            # В Flower /api/workers returns a dict where keys are worker names.
            # Each worker dict contains an "active" list of running tasks.
            active_count = len(workers)
            
            total_active_tasks = 0
            total_queued_tasks = 0
            worker_stats_list = []

            for name, worker_info in workers.items():
                 active_list = worker_info.get("active", [])
                 reserved_list = worker_info.get("reserved", [])
                 stats = worker_info.get("stats", {})
                 
                 active_count_w = len(active_list) if isinstance(active_list, list) else 0
                 queued_count_w = len(reserved_list) if isinstance(reserved_list, list) else 0
                 
                 # Extract concurrency and memory
                 pool_stats = stats.get("pool", {})
                 concurrency = pool_stats.get("max-concurrency", 0)
                 
                 rusage = stats.get("rusage", {})
                 memory_usage = rusage.get("maxrss", 0) # KB
                 
                 total_active_tasks += active_count_w
                 total_queued_tasks += queued_count_w
                 
                 worker_stats_list.append(WorkerStatsSchema(
                     name=name,
                     status=True, # Если есть в списке, значит, скорее всего, жив
                     active_tasks=active_count_w,
                     concurrency=concurrency,
                     queued_tasks=queued_count_w,
                     memory_usage=memory_usage
                 ))

            status_text = "OK" if active_count > 0 else "No active workers"
            
            return WorkerHealthResponseSchema(
                active_workers=active_count,
                active_tasks=total_active_tasks,
                queued_tasks=total_queued_tasks,
                status=status_text,
                workers=worker_stats_list
            )
        except (httpx.RequestError, httpx.HTTPStatusError):
            # В случае ошибки подключения к Flower считаем, что система не здорова
            return WorkerHealthResponseSchema(
                active_workers=0,
                active_tasks=0,
                queued_tasks=0,
                status="Monitoring Unavailable",
                workers=[]
            )


    def get_all_tasks(self) -> dict[str, TaskDefinition]:
        """Возвращает все зарегистрированные задачи."""
        return TASK_REGISTRY

    def run_task_by_name(
        self, 
        task_name: str, 
        params: dict[str, Any], 
        user_permissions: list[str], 
        triggered_by: str,
        db: Session | None = None
    ) -> str:
        """
        Запускает задачу по ее имени, предварительно выполнив проверки.
        Возвращает ID выполнения задачи.
        """
        # 1. Найти задачу в реестре
        task_def = TASK_REGISTRY.get(task_name)
        if not task_def:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found.")

        # 2. Проверить разрешения
        if task_def.permission:
            if task_def.permission not in user_permissions:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Permission denied. Required: {task_def.permission}",
                )

        # 3. Валидация параметров
        try:
            validated_params = task_def.params_schema(**params)
        except ValidationError as e:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail={"msg": "Task parameter validation error", "errors": e.errors()},
            ) from None

        # 4. Загрузка контекста (если есть context_loader)
        context_params = {}
        if task_def.context_loader:
             if not db:
                 logger.warning(f"Task '{task_name}' has context_loader but no DB session provided.")
             else:
                 try:
                     context_params = task_def.context_loader(db)
                 except Exception as e:
                     logger.error(f"Failed to load context for task '{task_name}': {e}")
                     raise HTTPException(
                         status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
                         detail="Failed to prepare task context."
                     )

        # 5. Создать запись выполнения
        stored_params = {"task_type": task_name, **validated_params.model_dump()}
        execution = self.execution_service.create_execution(
            task_name=task_name, params=stored_params, triggered_by=triggered_by
        )
        execution_id = str(execution.id)

        # 6. Отправить задачу в Celery
        final_kwargs = {
            "execution_id": execution_id,
            **stored_params,
            **context_params
        }

        celery_client.send_task(
            "tasks.dispatch",  # Имя универсального диспетчера в celery_worker
            kwargs=final_kwargs,
        )

        return execution_id
