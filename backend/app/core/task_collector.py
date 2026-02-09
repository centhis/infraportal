import importlib
import pkgutil

from app.core.task_contract import TaskDefinition

_task_cache: dict[str, TaskDefinition] = {}


def collect_all_tasks() -> list[TaskDefinition]:
    """Собирает все задачи из субмодулей."""
    if _task_cache:
        return list(_task_cache.values())

    # Стартуем с пакета app
    package_name = "app"
    try:
        package = importlib.import_module(package_name)
    except ImportError:
        return []

    # Рекурсивный обход всех подмодулей app
    prefix = package.__name__ + "."
    for _, name, _ in pkgutil.walk_packages(package.__path__, prefix):
        # Оптимизация: рассматриваем только модули, содержащие "tasks" в пути
        # Например: app.users.ldap.tasks, app.tasks.tasks
        parts = name.split(".")
        if "tasks" not in parts:
            continue

        try:
            module = importlib.import_module(name)

            # 1. Ищем одиночную задачу 'TASK'
            single_task = getattr(module, "TASK", None)
            if isinstance(single_task, TaskDefinition):
                if single_task.name not in _task_cache:
                    _task_cache[single_task.name] = single_task

            # 2. Ищем список задач 'TASK_DEFINITIONS'
            task_defs = getattr(module, "TASK_DEFINITIONS", [])
            if isinstance(task_defs, list):
                for task in task_defs:
                    if isinstance(task, TaskDefinition):
                        if task.name not in _task_cache:
                            _task_cache[task.name] = task
        except Exception as e:
            # Игнорируем ошибки импорта при сканировании, но логгируем их для отладки
            import logging

            logging.getLogger(__name__).debug(f"Failed to scan task module {name}: {e}")
            continue

    return list(_task_cache.values())


def get_task_definition(name: str) -> TaskDefinition | None:
    """Возвращает определение задачи по имени."""
    if not _task_cache:
        collect_all_tasks()
    return _task_cache.get(name)
