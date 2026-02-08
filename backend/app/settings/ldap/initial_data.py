import logging

from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.scheduling import scheduler
from app.core.security import encrypt_value
from app.settings.ldap.models import LdapSetting

logger = logging.getLogger(__name__)


def init_data(db: Session):
    """
    Инициализирует дефолтные настройки LDAP в базе данных.
    Использует значения из глобального конфига (settings),
    которые автоматически подгружаются из .env или окружения ОС.
    """
    default_settings = [
        {
            "key": "LDAP_ENABLED",
            "value": str(settings.LDAP_ENABLED).lower(),
            "type": "bool",
            "is_sensitive": False,
        },
        {
            "key": "LDAP_URI",
            "value": settings.LDAP_URI or "",
            "type": "string",
            "is_sensitive": False,
        },
        {
            "key": "LDAP_BASE_DN",
            "value": settings.LDAP_BASE_DN or "",
            "type": "string",
            "is_sensitive": False,
        },
        {
            "key": "LDAP_BIND_DN",
            "value": settings.LDAP_BIND_DN or "",
            "type": "string",
            "is_sensitive": False,
        },
        {
            "key": "LDAP_BIND_PASSWORD",
            "value": settings.LDAP_BIND_PASSWORD or "",
            "type": "string",
            "is_sensitive": True,
        },
        {
            "key": "LDAP_USER_FILTER",
            "value": settings.LDAP_USER_FILTER or "",
            "type": "string",
            "is_sensitive": False,
        },
        {
            "key": "LDAP_TLS_VERIFY",
            "value": str(settings.LDAP_TLS_VERIFY).lower(),
            "type": "bool",
            "is_sensitive": False,
        },
    ]

    for setting_data in default_settings:
        existing = db.query(LdapSetting).filter(LdapSetting.key == setting_data["key"]).first()
        if not existing:
            final_value = setting_data["value"]
            if setting_data["is_sensitive"] and final_value:
                logger.info(f"Encrypting sensitive value for {setting_data['key']} from config")
                final_value = encrypt_value(final_value)

            logger.info(f"Creating initial LDAP setting: {setting_data['key']}")
            new_setting = LdapSetting(
                key=setting_data["key"],
                value=final_value,
                type=setting_data["type"],
                is_sensitive=setting_data["is_sensitive"],
            )
            db.add(new_setting)

    db.commit()

    # --- Настройка расписания синхронизации LDAP ---
    # Использование Core Proxy для отвязки от модуля Tasks
    
    # Пытаемся получить существующую задачу, чтобы сохранить пользовательские настройки (время, вкл/выкл)
    # Это решает проблему сброса настроек, измененных через UI, при перезапуске бэкенда.
    existing_task_info = scheduler.get_periodic_task_info(db, task_name="Users: LDAP Sync")
    
    if existing_task_info:
        logger.info("LDAP Sync task exists. Preserving schedule and enabled status from DB.")
        ldap_schedule = existing_task_info["cron_schedule"]
        ldap_enabled = existing_task_info["enabled"]
    else:
        logger.info("LDAP Sync task not found. Using default settings.")
        ldap_enabled = str(settings.LDAP_ENABLED).lower() == "true"
        # Если настройки нет, используем дефолт
        ldap_schedule = settings.LDAP_SYNC_SCHEDULE or "0 0 * * *"

    scheduler.create_or_update_periodic_task(
        db,
        task_name="Users: LDAP Sync",
        task_func="tasks.dispatch",
        cron_schedule=ldap_schedule,
        kwargs={
            "task_type": "users:sync_ldap",
            "schedule_id": "Users: LDAP Sync",
            # Мы больше не передаем настройки через аргументы задачи,
            # так как воркер будет запрашивать их динамически через API /secrets
        },
        enabled=ldap_enabled,
    )
    db.commit() # Явно фиксируем изменения (особенно kwargs)
