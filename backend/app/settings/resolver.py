from typing import Any, Protocol

from sqlalchemy.orm import Session


class SettingGetter(Protocol):
    def __call__(self, db: Session, key: str) -> Any | None: ...


# Реестр геттеров настроек внутри модуля settings
_setting_getters: list[SettingGetter] = []


def register_setting_getter(getter: SettingGetter):
    """
    Регистрирует функцию получения настроек из подмодуля (ldap, core, mail и т.д.).
    новые геттеры добавляются в начало списка, чтобы иметь приоритет (или в конец, зависит от логики).
    В данном случае: Submodules (LDAP) should override Core? Or Core is fallback?
    Обычно специализированные настройки (LDAP) важнее, поэтому добавляем в начало.
    """
    _setting_getters.insert(0, getter)


def settings_resolver(db: Session, key: str) -> Any | None:
    """
    Главный резолвер для модуля settings.
    Итерируется по всем зарегистрированным геттерам подмодулей.
    """
    for getter in _setting_getters:
        val = getter(db, key)
        if val is not None:
            return val
    return None
