from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth.dependencies import CurrentUser, get_current_user, permission_checker
from app.db.database import get_db
from app.settings.core import services
from app.settings.core.schemas import CoreSettingSchema, CoreSettingUpdate

router = APIRouter(
    prefix="/settings/core",
    tags=["Core Settings"],
)


@router.get(
    "",
    response_model=list[CoreSettingSchema],
    dependencies=[Depends(permission_checker(["settings:view"]))],
)
def read_core_settings(
    db: Session = Depends(get_db), current_user: CurrentUser = Depends(get_current_user)
):
    """
    Получает все настройки ядра.
    """
    return services.get_all_core_settings(db=db)


@router.get(
    "/{key}",
    response_model=CoreSettingSchema,
    dependencies=[Depends(permission_checker(["settings:view"]))],
)
def read_core_setting(
    key: str, db: Session = Depends(get_db), current_user: CurrentUser = Depends(get_current_user)
):
    """
    Получает одну настройку ядра по ключу.
    """
    db_setting = services.get_core_setting_by_key(db=db, key=key)
    if db_setting is None:
        raise HTTPException(status_code=404, detail="Setting not found")
    return db_setting


@router.put(
    "/{key}",
    response_model=CoreSettingSchema,
    dependencies=[Depends(permission_checker(["settings:update"]))],
)
def update_core_setting(
    key: str,
    setting: CoreSettingUpdate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Обновляет настройку ядра.
    """
    db_setting = services.get_core_setting_by_key(db=db, key=key)
    if db_setting is None:
        raise HTTPException(status_code=404, detail="Setting not found")

    updated_setting = services.update_core_setting(db=db, key=key, value=setting.value)
    return updated_setting
