# celery_worker/task_registry.py
import importlib
import logging
from pathlib import Path
from typing import Callable, Dict, Any

logger = logging.getLogger(__name__)

_task_handlers: Dict[str, Callable[..., Any]] = {}


def register_task_handler(task_type: str, handler: Callable[..., Any]):
    """
    Регистрирует функцию-обработчик для заданного типа задачи.
    """
    if task_type in _task_handlers:
        logger.warning(f"Handler for task_type '{task_type}' is already registered. Overwriting.")
    _task_handlers[task_type] = handler


def get_task_handler(task_type: str) -> Callable[..., Any]:
    """
    Возвращает зарегистрированный обработчик для заданного типа задачи.
    """
    handler = _task_handlers.get(task_type)
    if not handler:
        raise ValueError(f"Handler for task_type '{task_type}' not found.")
    return handler


def autodiscover_handlers(handlers_root_path: Path):
    """
    Автоматически обнаруживает и импортирует все модули с обработчиками
    из указанной директории.
    """
    logger.info(f"Starting handlers discovery in '{handlers_root_path}'...")
    # handlers_root_path.parent - это корень приложения (например, /app в контейнере)
    app_root = handlers_root_path.parent

    for file_path in handlers_root_path.rglob("*.py"):
        if file_path.name == "__init__.py":
            continue

        # Преобразуем путь к файлу в имя модуля
        # e.g., /app/handlers/sub/file.py -> handlers.sub.file
        relative_path = file_path.relative_to(app_root)
        module_name = ".".join(relative_path.with_suffix("").parts)

        try:
            import sys
            if module_name in sys.modules:
                importlib.reload(sys.modules[module_name])
            else:
                importlib.import_module(module_name)
            logger.info(f"Successfully discovered and imported module: {module_name}")

        except Exception as e:
            logger.error(f"Failed to import handler module {module_name}: {e}", exc_info=True)
    logger.info("Handler discovery finished.")