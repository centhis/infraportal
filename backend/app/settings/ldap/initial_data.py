import logging
from sqlalchemy.orm import Session
from app.settings.ldap.models import LdapSetting
from app.core.security import encrypt_value
from app.core.config import settings
from app.core.scheduling import scheduler

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
            "is_sensitive": False
        },
        {
            "key": "LDAP_URI",
            "value": settings.LDAP_URI or "",
            "type": "string",
            "is_sensitive": False
        },
        {
            "key": "LDAP_BASE_DN",
            "value": settings.LDAP_BASE_DN or "",
            "type": "string",
            "is_sensitive": False
        },
        {
            "key": "LDAP_BIND_DN",
            "value": settings.LDAP_BIND_DN or "",
            "type": "string",
            "is_sensitive": False
        },
        {
            "key": "LDAP_BIND_PASSWORD",
            "value": settings.LDAP_BIND_PASSWORD or "",
            "type": "string",
            "is_sensitive": True
        },
        {
            "key": "LDAP_USER_FILTER",
            "value": settings.LDAP_USER_FILTER or "",
            "type": "string",
            "is_sensitive": False
        },
        {
            "key": "LDAP_SYNC_SCHEDULE",
            "value": settings.LDAP_SYNC_SCHEDULE,
            "type": "string",
            "is_sensitive": False
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
                is_sensitive=setting_data["is_sensitive"]
            )
            db.add(new_setting)
    
    db.commit()

    # --- LDAP Sync Schedule Setup ---
    # Using Core Proxy to decouple from Tasks module
    
    ldap_enabled = str(settings.LDAP_ENABLED).lower() == "true"
    
    scheduler.create_or_update_periodic_task(
        db,
        task_name="Users: LDAP Sync",
        task_func="tasks.dispatch",
        cron_schedule=settings.LDAP_SYNC_SCHEDULE,
        kwargs={
            "task_type": "users:sync_ldap",
            "ldap_uri": settings.LDAP_URI or "",
            "base_dn": settings.LDAP_BASE_DN or "",
            "bind_dn": settings.LDAP_BIND_DN or "",
            "user_filter": settings.LDAP_USER_FILTER or "",
            "attributes_mapping": {}
        },
        enabled=ldap_enabled
    )
    
    # We don't need explicit commit here as service does it, but it doesn't hurt.
