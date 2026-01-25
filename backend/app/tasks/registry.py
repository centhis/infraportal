# backend/app/tasks/registry.py
import importlib
import pkgutil
from typing import Dict, Type, Optional
from pydantic import BaseModel
from dataclasses import dataclass

@dataclass
class TaskDefinition:
    """Определение фоновой задачи для реестра."""
    name: str
    params_schema: Type[BaseModel]
    permission: Optional[str]

# Глобальный реестр для хранения определений всех задач
TASK_REGISTRY: Dict[str, TaskDefinition] = {}

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
                    for name, schema, perm in module.TASK_DEFINITIONS:
                        if name not in TASK_REGISTRY:
                            TASK_REGISTRY[name] = TaskDefinition(
                                name=name,
                                params_schema=schema,
                                permission=perm
                            )
            except ImportError:
                continue

def register_task(name: str, params_schema: Type[BaseModel], permission: Optional[str]):
    """
    Декоратор или функция для ручной регистрации задачи.
    Полезно для простых случаев или когда автообнаружение нежелательно.
    """
    if name in TASK_REGISTRY:
        raise ValueError(f"Задача с именем '{name}' уже зарегистрирована.")
    
    TASK_REGISTRY[name] = TaskDefinition(
        name=name,
        params_schema=params_schema,
        permission=permission
    )
