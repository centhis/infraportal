from typing import List, Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.settings.ldap import services
from app.settings.ldap.schemas import LdapSettingSchema, LdapSettingUpdate, LdapTestSettingsSchema, LdapTestResultSchema, LdapBulkUpdateSchema
from app.auth.dependencies import get_current_user, permission_checker
from app.users.models import User

router = APIRouter(
    prefix="/settings/ldap",
    tags=["LDAP Settings"],
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
    return services.update_ldap_settings_bulk(db=db, settings_dict=bulk_data.settings)
