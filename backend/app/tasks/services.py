import logging
from typing import Any

import httpx
from fastapi import Depends, HTTPException, status
from pydantic import ValidationError
from sqlalchemy.orm import Session

from app.core import task_collector
from app.core.celery_client import celery_client
from app.core.config import settings
from app.core.task_contract import TaskDefinition

from .execution_service import TaskExecutionService
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
            # Явно запрашиваем обновление, чтобы получить актуальный статус воркеров
            # Это исправляет проблему, когда Flower может вернуть пустой список, если он недавно не опрашивал воркоры
            response = await self.http_client.get(url, params={"refresh": True})
            response.raise_for_status()

            workers = response.json()
            # В Flower /api/workers возвращает словарь, где ключи - имена воркеров.
            # Каждый словарь воркера содержит список "active" с запущенными задачами.
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

                # Извлекаем конкурентность и память
                pool_stats = stats.get("pool", {})
                concurrency = pool_stats.get("max-concurrency", 0)

                rusage = stats.get("rusage", {})
                memory_usage = rusage.get("maxrss", 0)  # КБ

                total_active_tasks += active_count_w
                total_queued_tasks += queued_count_w

                worker_stats_list.append(
                    WorkerStatsSchema(
                        name=name,
                        status=True,  # Если есть в списке, значит, скорее всего, жив
                        active_tasks=active_count_w,
                        concurrency=concurrency,
                        queued_tasks=queued_count_w,
                        memory_usage=memory_usage,
                    )
                )

            status_text = "OK" if active_count > 0 else "No active workers"

            return WorkerHealthResponseSchema(
                active_workers=active_count,
                active_tasks=total_active_tasks,
                queued_tasks=total_queued_tasks,
                status=status_text,
                workers=worker_stats_list,
            )
        except (httpx.RequestError, httpx.HTTPStatusError):
            # В случае ошибки подключения к Flower считаем, что система не здорова
            return WorkerHealthResponseSchema(
                active_workers=0,
                active_tasks=0,
                queued_tasks=0,
                status="Monitoring Unavailable",
                workers=[],
            )

    def get_all_tasks(self) -> dict[str, TaskDefinition]:
        """Возвращает все зарегистрированные задачи в виде словаря."""
        return {task.name: task for task in task_collector.collect_all_tasks()}

    def run_task_by_name(
        self,
        task_name: str,
        params: dict[str, Any],
        user_permissions: list[str],
        triggered_by: str,
        db: Session | None = None,
    ) -> str:
        """
        Запускает задачу по ее имени, предварительно выполнив проверки.
        """
        # 1. Найти задачу через коллектор
        task_def = task_collector.get_task_definition(task_name)
        if not task_def:
            logger.error(f"Task definition NOT FOUND for name: {task_name}")
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found.")

        # 2. Проверить разрешения
        if task_def.permission:
            if task_def.permission not in user_permissions:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Permission denied. Required: {task_def.permission}",
                )

        # 3. Валидация параметров через Pydantic
        validated_params_dict = {}
        if task_def.params_schema:
            try:
                validated_model = task_def.params_schema(**params)
                validated_params_dict = validated_model.model_dump()
            except ValidationError as e:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                    detail={"msg": "Task parameter validation error", "errors": e.errors()},
                ) from e
        elif params:
            # Если схемы нет, но параметры переданы - логгируем предупреждение, но позволяем запуск
            # (может быть полезно для отладки или старых задач)
            logger.warning(f"Task '{task_name}' run with params but has no params_schema defined.")
            validated_params_dict = params

        # 4. Создать запись выполнения
        stored_params = {"task_type": task_name, **validated_params_dict}
        execution = self.execution_service.create_execution(
            task_name=task_name, params=stored_params, triggered_by=triggered_by
        )
        execution_id = str(execution.id)

        # 5. Подготовка аргументов для Celery
        final_kwargs = {"execution_id": execution_id, **stored_params}

        # 6. Отправить задачу в Celery
        celery_client.send_task(
            "tasks.dispatch",
            kwargs=final_kwargs,
        )

        return execution_id
