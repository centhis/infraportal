"""
Прокси-модуль для получения LDAP-настроек из БД.

Этот модуль позволяет другим доменам (например, users) получать
LDAP-конфигурацию без прямого импорта из settings.
"""

from typing import Any

from sqlalchemy.orm import Session


def get_ldap_connection_config(db: Session) -> dict[str, Any]:
    """
    Получает настройки подключения к LDAP из БД.

    Returns:
        dict с ключами: uri, base_dn, bind_dn, bind_password, user_filter
    """
    # Локальный импорт для избежания циклических зависимостей
    from app.settings.ldap import services as ldap_settings_service

    return {
        "uri": ldap_settings_service.get_ldap_setting_value(db, "LDAP_URI"),
        "base_dn": ldap_settings_service.get_ldap_setting_value(db, "LDAP_BASE_DN"),
        "bind_dn": ldap_settings_service.get_ldap_setting_value(db, "LDAP_BIND_DN"),
        "bind_password": ldap_settings_service.get_ldap_setting_value(db, "LDAP_BIND_PASSWORD"),
        "user_filter": ldap_settings_service.get_ldap_setting_value(db, "LDAP_USER_FILTER"),
    }


def get_ldap_setting_value(db: Session, key: str) -> str | None:
    """
    Получает значение одной LDAP-настройки из БД.

    Args:
        db: Сессия БД
        key: Ключ настройки (например, "LDAP_URI")

    Returns:
        Значение настройки или None
    """
    from app.settings.ldap import services as ldap_settings_service

    return ldap_settings_service.get_ldap_setting_value(db, key)


def is_ldap_enabled(db: Session) -> bool:
    """
    Проверяет, включена ли интеграция с LDAP.
    """
    from app.settings.ldap import services as ldap_settings_service

    return ldap_settings_service.is_ldap_enabled(db)
