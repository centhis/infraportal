from typing import Any
from uuid import UUID

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel

from app.auth.dependencies import get_worker_api_key
from app.db.database import db_dependency
from app.settings.ldap.services import get_ldap_setting_value
from app.tasks.models import ExecutionStatus
from app.tasks.services import TaskExecutionService

router = APIRouter(tags=["Internal Tasks"])


class SecretsRequest(BaseModel):
    task_type: str


@router.post("/secrets", dependencies=[Depends(get_worker_api_key)])
def get_task_secrets(
    request: SecretsRequest,
    db: db_dependency,
):
    """
    Возвращает секреты для задачи по ее типу.
    """
    secrets = {}
    if request.task_type == "users:sync_ldap":
        # Получаем все настройки LDAP для выполнения задачи
        # Пароль будет расшифрован внутри get_ldap_setting_value
        password = get_ldap_setting_value(db, "LDAP_BIND_PASSWORD")
        if password:
            secrets["LDAP_BIND_PASSWORD"] = password
            
        secrets["LDAP_URI"] = get_ldap_setting_value(db, "LDAP_URI")
        secrets["LDAP_BASE_DN"] = get_ldap_setting_value(db, "LDAP_BASE_DN")
        secrets["LDAP_BIND_DN"] = get_ldap_setting_value(db, "LDAP_BIND_DN")
        secrets["LDAP_USER_FILTER"] = get_ldap_setting_value(db, "LDAP_USER_FILTER")
        secrets["LDAP_TLS_VERIFY"] = get_ldap_setting_value(db, "LDAP_TLS_VERIFY")

    return {"secrets": secrets}


class TaskExecutionRequest(BaseModel):
    schedule_id: str


@router.post("/task_execution")
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
    from app.tasks.models import PeriodicTask
    import json

    task = db.query(PeriodicTask).filter(PeriodicTask.name == request.schedule_id).first()
    if not task:
        raise HTTPException(status_code=404, detail=f"Periodic task '{request.schedule_id}' not found")

    # 2. Извлечь параметры (они хранятся как JSON строка)
    task_kwargs = {}
    if task.kwargs:
        try:
            task_kwargs = json.loads(task.kwargs)
        except json.JSONDecodeError:
            pass
            
    task_type = task_kwargs.get("task_type")
    if not task_type:
         raise HTTPException(status_code=500, detail=f"Periodic task '{request.schedule_id}' has no 'task_type' in kwargs")

    # 3. Создать запись выполнения
    # Мы используем 'system' или имя расписания как triggered_by
    execution = execution_service.create_execution(
        task_name=task_type,
        params=task_kwargs,
        triggered_by=f"schedule:{request.schedule_id}"
    )

    return {
        "execution_id": str(execution.id),
        "task_type": task_type,
        "params": task_kwargs
    }


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
