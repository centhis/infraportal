import logging
from sqlalchemy.orm import Session
from app.settings.core.models import CoreSetting
from app.core.config import settings

logger = logging.getLogger(__name__)

def init_data(db: Session):
    """
    Инициализирует дефолтные CORE настройки в базе данных.
    """
    default_settings = [
        {
            "key": "SITE_NAME",
            "value": "Infraportal",
            "type": "string",
            "is_sensitive": False
        },
        {
            "key": "ADMIN_EMAIL",
            "value": "admin@example.com",
            "type": "string",
            "is_sensitive": False
        },
        {
            "key": "TASK_TIMEOUT",
            "value": str(settings.TASK_TIMEOUT),
            "type": "integer",
            "is_sensitive": False
        }
    ]

    for setting_data in default_settings:
        existing = db.query(CoreSetting).filter(CoreSetting.key == setting_data["key"]).first()
        if not existing:
            logger.info(f"Creating initial Core setting: {setting_data['key']}")
            new_setting = CoreSetting(
                key=setting_data["key"],
                value=setting_data["value"],
                type=setting_data["type"],
                is_sensitive=setting_data["is_sensitive"]
            )
            db.add(new_setting)
    
    db.commit()
