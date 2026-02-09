import logging
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Body, Depends, HTTPException, Query

from app.auth.dependencies import get_worker_api_key
from app.core.settings_resolver import resolve_setting
from app.core.task_dispatcher import dispatch_result
from app.db.database import db_dependency
from app.tasks.models import ExecutionStatus, TaskDefinitionModel
from app.tasks.schemas import SecretsRequest, TaskExecutionRequest, TaskResultRequest
from app.tasks.services import TaskExecutionService

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Internal Tasks"])


@router.post("/secrets", dependencies=[Depends(get_worker_api_key)])
def get_task_secrets(
    request: SecretsRequest,
    db: db_dependency,
):
    """
    Возвращает секреты для задачи по ее типу.
    """
    task_def = db.query(TaskDefinitionModel).filter_by(name=request.task_type).first()
    if not task_def:
        # Если задачи нет в definitions, возвращаем пустой dict
        # (Возможно, это старая задача или hardcoded worker-only)
        return {"secrets": {}}

    secrets = {}
    for key in task_def.secrets or []:
        val = resolve_setting(db, key)
        if val is not None:
            secrets[key] = val

    return {"secrets": secrets}


@router.post("/task_execution", dependencies=[Depends(get_worker_api_key)])
def create_task_execution_from_schedule(
    request: TaskExecutionRequest,
    db: db_dependency,
    execution_service: TaskExecutionService = Depends(),
):
    """
    Создает запись выполнения задачи на основе расписания (PeriodicTask).
    Используется воркером при запуске задачи по расписанию, чтобы получить execution_id.
    """
    # 1. Найти периодическую задачу по имени (schedule_id)
    # Импорт здесь, чтобы избежать циклических ссылок, если они есть
    import json

    from app.tasks.models import PeriodicTask

    task = db.query(PeriodicTask).filter(PeriodicTask.name == request.schedule_id).first()
    if not task:
        raise HTTPException(
            status_code=404, detail=f"Periodic task '{request.schedule_id}' not found"
        )

    # 2. Извлечь параметры (они хранятся как JSON строка)
    task_kwargs = {}
    if task.kwargs:
        try:
            task_kwargs = json.loads(task.kwargs)
        except json.JSONDecodeError:
            pass

    task_type = task_kwargs.get("task_type")
    if not task_type:
        raise HTTPException(
            status_code=500,
            detail=f"Periodic task '{request.schedule_id}' has no 'task_type' in kwargs",
        )

    # 3. Создать запись выполнения
    # Мы используем 'system' или имя расписания как triggered_by
    execution = execution_service.create_execution(
        task_name=task_type, params=task_kwargs, triggered_by=f"schedule:{request.schedule_id}"
    )

    return {"execution_id": str(execution.id), "task_type": task_type, "params": task_kwargs}


@router.post("/tasks/{execution_id}/result", dependencies=[Depends(get_worker_api_key)])
def receive_task_result(
    execution_id: UUID,
    body: TaskResultRequest,
    db: db_dependency,
    execution_service: TaskExecutionService = Depends(),
):
    """
    Принимает результат выполнения задачи от воркера.
    Передает результат в соответствующий result_handler для обработки.
    Обновляет статус выполнения.
    """
    execution = execution_service.get_execution(execution_id)
    if not execution:
        raise HTTPException(status_code=404, detail="Execution not found")

    try:
        # Передаем результат в обработчик модуля
        processed_result = dispatch_result(db, execution.task_type, body.result)

        # Обновляем статус на SUCCESS (или переданный статус) с обработанным результатом
        execution_service.update_status(execution_id, status=body.status, result=processed_result)

    except Exception as e:
        # Логируем ошибку обработки
        # В этом случае задача технически завершилась на воркере, но постобработка упала.
        # Помечаем как FAILED, чтобы админ видел ошибку.
        logger.error(f"Error processing result for {execution.task_type} (id={execution_id}): {e}")
        execution_service.update_status(
            execution_id,
            status=ExecutionStatus.FAILURE,
            result={"error": f"Result handler failed: {str(e)}", "raw_result": body.result},
        )
        raise HTTPException(status_code=500, detail=f"Result processing failed: {str(e)}") from e

    return {"status": "ok"}


@router.patch("/tasks/{execution_id}", dependencies=[Depends(get_worker_api_key)])
def update_task_execution(
    execution_id: UUID,
    status: ExecutionStatus | None = Body(None),
    result: dict[str, Any] | None = Body(None),
    heartbeat: bool = Body(False),
    execution_service: TaskExecutionService = Depends(),
):
    """
    Внутренний эндпоинт для воркеров Celery для обновления статуса задачи или отправки сердцебиений.
    Защищен API ключом воркера.
    """
    if heartbeat:
        return execution_service.update_heartbeat(execution_id)

    if status:
        return execution_service.update_status(execution_id, status, result)

    raise HTTPException(status_code=400, detail="No updates provided")


@router.get("/tasks/stale", dependencies=[Depends(get_worker_api_key)])
def get_stale_tasks(
    timeout_seconds: int = Query(300), execution_service: TaskExecutionService = Depends()
) -> list[UUID]:
    """
    Возвращает ID задач, которые не отправляли сердцебиение дольше timeout_seconds.
    Используется задачей system:cleanup_zombie_tasks.
    """
    stale_tasks = execution_service.get_stale_executions(timeout_seconds)
    return [t.id for t in stale_tasks]
