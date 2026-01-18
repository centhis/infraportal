from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.settings.core import services
from app.settings.core.schemas import CoreSettingSchema, CoreSettingUpdate
from app.auth.dependencies import get_current_user, permission_checker
from app.users.models import User

router = APIRouter(
    prefix="/settings/core",
    tags=["Core Settings"],
)

@router.get("", response_model=List[CoreSettingSchema], dependencies=[Depends(permission_checker(["settings:view"]))])
def read_core_settings(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Retrieve all core settings.
    """
    return services.get_all_core_settings(db=db)

@router.get("/{key}", response_model=CoreSettingSchema, dependencies=[Depends(permission_checker(["settings:view"]))])
def read_core_setting(key: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Retrieve a single core setting by key.
    """
    db_setting = services.get_core_setting_by_key(db=db, key=key)
    if db_setting is None:
        raise HTTPException(status_code=404, detail="Setting not found")
    return db_setting

@router.put("/{key}", response_model=CoreSettingSchema, dependencies=[Depends(permission_checker(["settings:update"]))])
def update_core_setting(key: str, setting: CoreSettingUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Update a core setting.
    """
    db_setting = services.get_core_setting_by_key(db=db, key=key)
    if db_setting is None:
        raise HTTPException(status_code=404, detail="Setting not found")
    
    updated_setting = services.update_core_setting(db=db, key=key, value=setting.value)
    return updated_setting
