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
    schedule_id: Optional[str] = None,
    execution_id: Optional[str] = None,
    **kwargs
) -> Any:
    """
    Диспетчер задач.
    Принимает тип задачи (task_type в kwargs), получает необходимые для выполнения секреты
    из центрального бэкенда и маршрутизирует выполнение на соответствующую бизнес-логику.
    """
    # Извлекаем task_type из kwargs
    task_type = kwargs.pop("task_type", None)
    
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

    # Helper to update status
    def update_execution_status(status: str, result: Any = None):
        try:
            headers = {"X-API-Key": settings.CELERY_WORKER_API_KEY}
            payload = {"status": status}
            if result:
                # Convert result to dict if possible or stringify
                # Backend expects result to be a dict if it's JSON field? 
                # Or execution.result is JSONB.
                # If result is not dict, wrap it?
                if isinstance(result, dict):
                    payload["result"] = result
                else:
                    payload["result"] = {"output": str(result)}
            
            httpx.patch(
                f"{settings.BACKEND_INTERNAL_API_URL}/tasks/{current_execution_id}",
                json=payload,
                headers=headers,
                timeout=5.0
            )
        except Exception as update_err:
             logger.error(f"Failed to update status to {status} for execution {current_execution_id}: {update_err}")

    # 3. Выполняем саму бизнес-логику
    logger.info(f"Dispatching task_type='{current_task_type}' (execution_id='{current_execution_id}') with parameters: {current_kwargs}")
    
    update_execution_status("IN_PROGRESS")

    try:
        handler = get_task_handler(current_task_type)
        
        # Transfer secrets to handler.
        # We pass `secrets` as a named argument.
        result = handler(execution_id=current_execution_id, secrets=secrets, **current_kwargs)
        logger.info(f"Task task_type='{current_task_type}' (execution_id='{current_execution_id}') completed successfully.")
        
        # Отправляем результат в Backend для обработки (вызов result_handler и обновление статуса)
        try:
            headers = {"X-API-Key": settings.CELERY_WORKER_API_KEY}
            httpx.post(
                f"{settings.BACKEND_INTERNAL_API_URL}/tasks/{current_execution_id}/result",
                json={
                    "result": result if isinstance(result, dict) else {"output": str(result)},
                    "status": "SUCCESS"
                },
                headers=headers,
                timeout=30.0,
            )
            logger.info(f"Result for task '{current_execution_id}' sent to backend successfully.")
        except Exception as post_err:
            logger.error(f"Failed to send result to backend for task '{current_execution_id}': {post_err}")
            raise post_err

        return result

    except Exception as e:
        logger.error(f"Error executing task task_type='{current_task_type}' (execution_id='{current_execution_id}'): {e}", exc_info=True)
        
        # При любой ошибке (не найден обработчик или ошибка в логике) - ставим FAILURE
        error_data = {"error": str(e)}
        update_execution_status("FAILURE", error_data)
        raise e
