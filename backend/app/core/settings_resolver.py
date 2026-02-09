from typing import Any, Protocol

from sqlalchemy.orm import Session


class SettingResolver(Protocol):
    def __call__(self, db: Session, key: str) -> Any | None: ...


_resolvers: list[SettingResolver] = []


def register_resolver(resolver: SettingResolver):
    """Регистрирует функцию для разрешения настроек."""
    _resolvers.append(resolver)


def resolve_setting(db: Session, key: str) -> Any | None:
    """
    Пытается получить значение настройки через зарегистрированные резолверы.
    """
    for resolver in _resolvers:
        val = resolver(db, key)
        if val is not None:
            return val
    return None
