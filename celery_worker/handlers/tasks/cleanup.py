
import logging
import httpx
from celery_app import celery_app
from config import settings
from task_registry import register_task_handler

logger = logging.getLogger(__name__)

def cleanup_zombie_tasks(execution_id: str, secret: str = None, **kwargs):
    """
    Системная задача для очистки зависших задач.
    1. Получает от бэкенда список stale tasks (зависание heartbeat).
    2. Проверяет, активны ли они на данном воркере (или вообще в кластере, если inspect позволяет).
    3. Если активны - убивает.
    4. Обновляет статус на FAILURE.
    """
    
    # timeout передается через параметры задачи (kwargs)
    timeout = kwargs.get("timeout_seconds", 300) 
    
    logger.info(f"Запуск очистки Zombie-задач (timeout={timeout}s)...")
    
    headers = {"X-API-Key": settings.CELERY_WORKER_API_KEY}
    
    try:
        # 1. Запрашиваем список stale tasks
        resp = httpx.get(
            f"{settings.BACKEND_INTERNAL_API_URL}/tasks/stale",
            params={"timeout_seconds": timeout},
            headers=headers,
            timeout=10.0
        )
        resp.raise_for_status()
        stale_task_ids = resp.json() # List[UUID string]
        
        if not stale_task_ids:
            logger.info("Zombie-задачи не найдены.")
            return {"status": "ok", "count": 0}
            
        logger.info(f"Найдено {len(stale_task_ids)} потенциальных зомби: {stale_task_ids}")

        # 2. Проверяем активность через inspect().active()
        inspector = celery_app.control.inspect()
        active_map = inspector.active() or {}
        
        # Собираем Execution IDs всех активных задач
        active_execution_ids = set()
        for worker_name, tasks in active_map.items():
            for t in tasks:
                kw = t.get('kwargs', {})
                if isinstance(kw, dict):
                     eid = kw.get('execution_id')
                     if eid:
                         active_execution_ids.add(str(eid))

        # 3. Обрабатываем каждый stale ID
        processed_count = 0
        
        for stale_id in stale_task_ids:
            stale_id_str = str(stale_id)
            error_reason = "Worker crashed or task lost"
            
            # Случай 1: Зависание (есть в активных)
            if stale_id_str in active_execution_ids:
                logger.warning(f"Задача {stale_id_str} зависла (есть в active). Пытаемся убить.")
                
                found_celery_id = None
                for worker_name, tasks in active_map.items():
                    for t in tasks:
                        kw = t.get('kwargs', {})
                        if kw.get('execution_id') == stale_id_str:
                            found_celery_id = t['id']
                            break
                    if found_celery_id:
                        break
                
                if found_celery_id:
                    celery_app.control.revoke(found_celery_id, terminate=True)
                    error_reason = "Task hung (timeout) and was terminated"
                else:
                    logger.error(f"Не удалось найти Celery ID для execution_id {stale_id_str}")

            # Случай 2: Потеряна (нет в активных) -> просто обновляем статус
            try:
                patch_url = f"{settings.BACKEND_INTERNAL_API_URL}/tasks/{stale_id_str}"
                httpx.patch(
                    patch_url,
                    json={
                        "status": "FAILURE",
                        "result": {"error": error_reason}
                    },
                    headers=headers,
                    timeout=5.0
                )
                logger.info(f"Задача {stale_id_str} помечена как FAILURE ({error_reason})")
                processed_count += 1
            except Exception as e:
                logger.error(f"Ошибка при обновлении статуса зомби-задачи {stale_id_str}: {e}")

        return {"status": "ok", "processed": processed_count}

    except Exception as e:
        logger.error(f"Critial error in zombie cleanup: {e}", exc_info=True)
        raise e

# Регистрация обработчика
register_task_handler("system:cleanup_zombie_tasks", cleanup_zombie_tasks)
