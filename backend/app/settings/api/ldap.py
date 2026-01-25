from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.settings.ldap import services
from app.settings.ldap.schemas import LdapSettingSchema, LdapSettingUpdate, LdapTestSettingsSchema, LdapTestResultSchema, LdapBulkUpdateSchema
from app.auth.dependencies import get_current_user, permission_checker
from app.users.models import User
from app.core.scheduling import scheduler
from app.settings.ldap.services import _convert_value_to_type

router = APIRouter(
    prefix="/settings/ldap",
    tags=["LDAP Settings"],
)

def _sync_schedule(db: Session):
    # Use Proxy instead of direct Service
    enabled_setting = services.get_ldap_setting_by_key(db, "LDAP_ENABLED")
    schedule_setting = services.get_ldap_setting_by_key(db, "LDAP_SYNC_SCHEDULE")
    
    enabled = _convert_value_to_type(enabled_setting.value, "bool") if enabled_setting else False
    schedule_str = schedule_setting.value if schedule_setting else "0 0 * * *"
    
    # Extract LDAP settings to pass into Worker
    # Note: BIND_PASSWORD is NOT passed here. Worker fetches it via API.
    ldap_settings = {
        "ldap_uri": services.get_ldap_setting_value(db, "LDAP_URI"),
        "base_dn": services.get_ldap_setting_value(db, "LDAP_BASE_DN"),
        "bind_dn": services.get_ldap_setting_value(db, "LDAP_BIND_DN"),
        "user_filter": services.get_ldap_setting_value(db, "LDAP_USER_FILTER"),
        "attributes_mapping": {} # Empty mapping triggers "defaults auto-detect" logic in Worker
    }

    scheduler.create_or_update_periodic_task(
        db,
        task_name="Users: LDAP Sync",
        task_func="tasks.dispatch",
        cron_schedule=schedule_str,
        kwargs={
            "task_type": "users:sync_ldap",
            **ldap_settings
        },
        enabled=enabled
    )

@router.get("", response_model=List[LdapSettingSchema], dependencies=[Depends(permission_checker(["settings:view"]))])
def read_ldap_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieve all LDAP settings.
    Requires permission: `settings:view`
    """
    return services.get_all_ldap_settings(db=db)

@router.get("/is_enabled", response_model=bool)
def is_ldap_enabled(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user) # All authenticated users
):
    """
    Check if LDAP integration is enabled.
    Accessible by any authenticated user.
    """
    return services.is_ldap_enabled(db=db)

@router.post("/test", response_model=LdapTestResultSchema, dependencies=[Depends(permission_checker(["settings:update"]))])
def test_ldap_settings(
    settings_data: LdapTestSettingsSchema,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Test LDAP settings without saving them.
    Requires permission: `settings:update`
    """
    return services.test_ldap_connection(settings_data=settings_data.settings)

@router.get("/{key}", response_model=LdapSettingSchema, dependencies=[Depends(permission_checker(["settings:view"]))])
def read_ldap_setting(
    key: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieve a single LDAP setting by key.
    Requires permission: `settings:view`
    """
    db_setting = services.get_ldap_setting_by_key(db=db, key=key)
    if db_setting is None:
        raise HTTPException(status_code=404, detail="Setting not found")
    return db_setting

@router.put("/{key}", response_model=LdapSettingSchema, dependencies=[Depends(permission_checker(["settings:update"]))])
def update_ldap_setting(
    key: str,
    setting: LdapSettingUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update an LDAP setting.
    Requires permission: `settings:update`
    """
    db_setting = services.get_ldap_setting_by_key(db=db, key=key)
    if db_setting is None:
        raise HTTPException(status_code=404, detail="Setting not found")
    
    updated_setting = services.update_ldap_setting(db=db, key=key, value=setting.value)
    
    if key in ["LDAP_SYNC_SCHEDULE", "LDAP_ENABLED"]:
        _sync_schedule(db)
        
    return updated_setting

@router.patch("", response_model=List[LdapSettingSchema], dependencies=[Depends(permission_checker(["settings:update"]))])
def update_ldap_settings_bulk(
    bulk_data: LdapBulkUpdateSchema,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Mass update LDAP settings.
    Requires permission: `settings:update`
    """
    result = services.update_ldap_settings_bulk(db=db, settings_dict=bulk_data.settings)
    
    keys = bulk_data.settings.keys()
    if "LDAP_SYNC_SCHEDULE" in keys or "LDAP_ENABLED" in keys:
        _sync_schedule(db)
        
    return result
