# celery_worker/handlers/test_handler.py
import logging
from typing import Any
from task_registry import register_task_handler

logger = logging.getLogger(__name__)

def handle_test_task(**kwargs: Any) -> str:
    """
    Тестовый обработчик, который просто логирует полученные аргументы.
    """
    logger.info(f"Executing test task with arguments: {kwargs}")
    return "Test task executed successfully!"

# Регистрация обработчика
register_task_handler("test_task", handle_test_task)