import importlib
import pkgutil
from dataclasses import dataclass
from typing import Callable, Any

from pydantic import BaseModel
from sqlalchemy.orm import Session


@dataclass
class TaskDefinition:
    """Определение фоновой задачи для реестра."""

    name: str
    params_schema: type[BaseModel]
    permission: str | None
    context_loader: Callable[[Session], dict[str, Any]] | None = None


# Глобальный реестр для хранения определений всех задач
TASK_REGISTRY: dict[str, TaskDefinition] = {}


def autodiscover_tasks(package_name: str = "app"):
    """
    Автоматически обнаруживает и регистрирует задачи из файлов tasks.py
    внутри указанного пакета (например, 'app').
    """
    package = importlib.import_module(package_name)

    for _, module_name, is_pkg in pkgutil.walk_packages(package.__path__, package.__name__ + "."):
        if is_pkg:
            try:
                # Рекурсивно ищем в подпакетах
                autodiscover_tasks(module_name)
            except (ImportError, FileNotFoundError):
                continue

        if module_name.endswith(".tasks"):
            try:
                module = importlib.import_module(module_name)
                if hasattr(module, "TASK_DEFINITIONS"):
                    for task_def_tuple in module.TASK_DEFINITIONS:
                        # Разбираем кортеж, поддерживая опциональный 4-й элемент
                        name = task_def_tuple[0]
                        schema = task_def_tuple[1]
                        perm = task_def_tuple[2]
                        context_loader = None
                        
                        if len(task_def_tuple) > 3:
                             context_loader = task_def_tuple[3]

                        if name not in TASK_REGISTRY:
                            TASK_REGISTRY[name] = TaskDefinition(
                                name=name,
                                params_schema=schema,
                                permission=perm,
                                context_loader=context_loader,
                            )
            except ImportError:
                continue


def register_task(
    name: str,
    params_schema: type[BaseModel],
    permission: str | None,
    context_loader: Callable[[Session], dict[str, Any]] | None = None,
):
    """
    Декоратор или функция для ручной регистрации задачи.
    Полезно для простых случаев или когда автообнаружение нежелательно.
    """
    if name in TASK_REGISTRY:
        raise ValueError(f"Task with name '{name}' is already registered.")

    TASK_REGISTRY[name] = TaskDefinition(
        name=name,
        params_schema=params_schema,
        permission=permission,
        context_loader=context_loader,
    )
