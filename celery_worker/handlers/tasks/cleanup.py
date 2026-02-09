
import logging
import httpx
from celery_app import celery_app
from config import settings
from task_registry import register_task_handler

logger = logging.getLogger(__name__)

def cleanup_zombie_tasks(execution_id: str, secret: str = None, **kwargs):
    """
    Системная задача для очистки зависших задач.
    1. Получает от бэкенда список stale tasks.
    2. Если активны в Celery - убивает (revoke).
    3. Возвращает список ID для финальной обработки на бэкенде.
    """
    timeout = kwargs.get("timeout_seconds", 300) 
    logger.info(f"Запуск очистки Zombie-задач (timeout={timeout}s)...")
    
    headers = {"X-API-Key": settings.CELERY_WORKER_API_KEY}
    
    try:
        # 1. Запрашиваем список stale tasks у бэкенда
        resp = httpx.get(
            f"{settings.BACKEND_INTERNAL_API_URL}/tasks/stale",
            params={"timeout_seconds": timeout},
            headers=headers,
            timeout=10.0
        )
        resp.raise_for_status()
        stale_task_ids = resp.json()
        
        if not stale_task_ids:
            logger.info("Zombie-задачи не найдены.")
            return {"terminated_ids": []}
            
        logger.info(f"Найдено {len(stale_task_ids)} потенциальных зомби.")

        # 2. Проверяем активность в Celery, чтобы сделать revoke
        inspector = celery_app.control.inspect()
        active_map = inspector.active() or {}
        
        active_tasks_lookup = {} # execution_id -> celery_id
        for worker_name, tasks in active_map.items():
            for t in tasks:
                kw = t.get('kwargs', {})
                if isinstance(kw, dict) and kw.get('execution_id'):
                    active_tasks_lookup[str(kw.get('execution_id'))] = t['id']

        # 3. Терминируем те, что еще активны, и собираем список для бэкенда
        terminated_ids = []
        for stale_id in stale_task_ids:
            stale_id_str = str(stale_id)
            
            # Если задача еще числится активной в Celery - убиваем её
            if stale_id_str in active_tasks_lookup:
                celery_id = active_tasks_lookup[stale_id_str]
                logger.warning(f"Терминируем зависшую задачу {stale_id_str} (Celery ID: {celery_id})")
                celery_app.control.revoke(celery_id, terminate=True)

            terminated_ids.append(stale_id_str)

        logger.info(f"Обработано {len(terminated_ids)} задач. Список передан бэкенду.")
        return {"terminated_ids": terminated_ids}

    except Exception as e:
        logger.error(f"Error in zombie cleanup: {e}", exc_info=True)
        raise e

# Регистрация обработчика
register_task_handler("system:cleanup_zombie_tasks", cleanup_zombie_tasks)
