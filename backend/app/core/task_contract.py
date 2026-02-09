from collections.abc import Callable
from dataclasses import dataclass, field
from typing import Any

from pydantic import BaseModel


@dataclass
class TaskDefinition:
    """Контракт определения задачи."""

    name: str  # Например: "users:sync_ldap"
    display_name: str  # "Синхронизация LDAP"
    category: str  # Например: "users"
    permission: str  # Например: "users:update"
    secrets: list[str] = field(default_factory=list)
    params_schema: type[BaseModel] | None = None  # Pydantic модель
    result_handler: Callable[[dict, Any], dict] | None = None
