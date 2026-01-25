
from sqlalchemy.orm import Session
from app.settings.models import TaskSecretMapping
import logging

logger = logging.getLogger(__name__)

DEFAULT_PERMISSIONS = [
    # (task_type, setting_key)
    ("users:sync_ldap", "LdapSetting:LDAP_BIND_PASSWORD"),
]

def init_permissions(db: Session):
    for task_type, setting_key in DEFAULT_PERMISSIONS:
        existing = db.query(TaskSecretMapping).filter_by(
            task_type=task_type, 
            setting_key=setting_key
        ).first()
        
        if not existing:
            logger.info(f"Adding task secret permission: {task_type} -> {setting_key}")
            mapping = TaskSecretMapping(
                task_type=task_type,
                setting_key=setting_key
            )
            db.add(mapping)
    
    db.commit()

def init_data(db: Session):
    init_permissions(db)
