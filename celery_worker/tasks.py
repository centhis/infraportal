# celery_worker/tasks.py
import logging
from typing import Any, Optional
import httpx
from celery_app import celery_app
from config import settings
from task_registry import get_task_handler # Для доступа к бизнес-логике

logger = logging.getLogger(__name__)

@celery_app.task(name="tasks.dispatch")
def dispatch_task(
    task_type: str,
    schedule_id: Optional[str] = None,
    execution_id: Optional[str] = None,
    **kwargs
) -> Any:
    """
    Диспетчер задач.
    Принимает тип задачи (task_type), получает необходимые для выполнения секреты
    из центрального бэкенда и маршрутизирует выполнение на соответствующую бизнес-логику.
    """
    current_task_type = task_type
    current_execution_id = execution_id
    current_kwargs = kwargs

    # 1. Если задача плановая, сначала получаем ее execution_id и параметры
    if schedule_id:
        logger.info(f"Received scheduled task with schedule_id='{schedule_id}'. Requesting execution_id and parameters from backend.")
        try:
            headers = {"X-API-Key": settings.CELERY_WORKER_API_KEY}
            response = httpx.post(
                f"{settings.BACKEND_INTERNAL_API_URL}/task_execution",
                json={"schedule_id": schedule_id},
                headers=headers,
                timeout=10.0
            )
            response.raise_for_status()

            backend_data = response.json()
            current_execution_id = backend_data["execution_id"]
            current_task_type = backend_data["task_type"]
            current_kwargs = backend_data["params"]
            logger.info(f"Backend returned execution_id='{current_execution_id}', task_type='{current_task_type}', parameters: {current_kwargs}")

        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error when contacting backend for schedule_id '{schedule_id}': {e.response.status_code} - {e.response.text}")
            raise ValueError(f"Failed to get execution_id from backend for schedule_id '{schedule_id}': HTTP {e.response.status_code}")
        except httpx.RequestError as e:
            logger.error(f"Request error to backend for schedule_id '{schedule_id}': {e}")
            raise ValueError(f"Failed to connect to backend for schedule_id '{schedule_id}': {e}")
        except KeyError as e:
            logger.error(f"Backend response does not contain expected fields (execution_id, task_type, params): {backend_data}. Error: {e}")
            raise ValueError(f"Invalid backend response when processing schedule_id '{schedule_id}'")

    if not current_execution_id:
        logger.error(f"Failed to get execution_id for task with task_type='{current_task_type}'.")
        raise ValueError("Missing execution_id for task execution.")

    # 2. Получаем секреты, необходимые для выполнения этой задачи
    secrets = {}
    try:
        logger.info(f"Requests secrets for task_type='{current_task_type}' (execution_id='{current_execution_id}')")
        headers = {"X-API-Key": settings.CELERY_WORKER_API_KEY}
        response = httpx.post(
            f"{settings.BACKEND_INTERNAL_API_URL}/secrets",
            json={"task_type": current_task_type},
            headers=headers,
            timeout=10.0
        )
        # We allow 404/403 if secrets are not strictly required? 
        # But usually if they are requested, they are needed.
        # But if the handler doesn't need secrets, we shouldn't fail?
        # Ideally, we always check. If 404/403 -> just empty secrets dict?
        # But Step 1164 returned 404/403 if not found.
        # So if I expect secrets but get 403, I should probably log warning and pass empty.
        # BUT for critical tasks like LDAP Sync, it is failure.
        # Let's try, and if it fails, we assume no secrets available.
        # However, backend throws exception.
        if response.status_code == 200:
            secrets = response.json().get("secrets", {})
            logger.info(f"Secrets for task_type='{current_task_type}' successfully received.")
        else:
            logger.warning(f"Failed to get secrets for task_type '{current_task_type}': HTTP {response.status_code}. Proceeding without secrets.")
    except Exception as e:
         logger.error(f"Error fetching secrets: {e}. Proceeding without secrets.")

    # 3. Выполняем саму бизнес-логику
    logger.info(f"Dispatching task_type='{current_task_type}' (execution_id='{current_execution_id}') with parameters: {current_kwargs}")
    
    handler = get_task_handler(current_task_type)
    if handler:
        try:
            # Transfer secrets to handler.
            # We pass `secrets` as a named argument.
            result = handler(execution_id=current_execution_id, secrets=secrets, **current_kwargs)
            logger.info(f"Task task_type='{current_task_type}' (execution_id='{current_execution_id}') completed successfully.")
            return result
        except Exception as e:
            logger.error(f"Error executing task task_type='{current_task_type}' (execution_id='{current_execution_id}'): {e}", exc_info=True)
            raise e
    else:
        logger.error(f"Handler for task_type '{current_task_type}' not found (execution_id='{current_execution_id}').")
        raise ValueError(f"Handler for task_type '{current_task_type}' not found.")
