from fastapi import APIRouter, Depends, Body, HTTPException, status
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.auth.dependencies import get_worker_api_key
from app.settings.models import TaskSecretMapping
from app.settings.ldap import services as ldap_services

# Registry mapping Model Name -> Getter Function
SETTINGS_PROVIDERS = {
    "LdapSetting": ldap_services.get_ldap_setting_value
}

router = APIRouter(tags=["Internal Settings"])

@router.post("/settings/secrets", dependencies=[Depends(get_worker_api_key)])
def get_task_secret(
    task_type: str = Body(..., embed=True),
    db: Session = Depends(get_db)
):
    """
    Внутренний эндпоинт для получения секретов задачи.
    Возвращает словарь всех разрешенных секретов.
    """
    # 1. Find all allowed keys
    mappings = db.query(TaskSecretMapping).filter(TaskSecretMapping.task_type == task_type).all()
    
    if not mappings:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"No secrets authorized for task type '{task_type}'."
        )

    # 2. Resolve values
    resolved_secrets = {}
    
    for mapping in mappings:
        parts = mapping.setting_key.split(":", 1)
        if len(parts) != 2:
            continue
            
        model_name, key_name = parts
        provider = SETTINGS_PROVIDERS.get(model_name)
        
        if provider:
            val = provider(db, key_name)
            if val is not None:
                resolved_secrets[key_name] = val
    
    if not resolved_secrets:
         raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail=f"Secret keys found but values are missing for '{task_type}'."
        )

    return {"secrets": resolved_secrets}
