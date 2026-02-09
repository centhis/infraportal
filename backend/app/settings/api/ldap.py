from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth.dependencies import CurrentUser, get_current_user, permission_checker
from app.db.database import get_db
from app.settings.ldap import services
from app.settings.ldap.schemas import (
    LdapBulkUpdateSchema,
    LdapEnabledResponse,
    LdapSettingSchema,
    LdapSettingUpdate,
    LdapTestResultSchema,
    LdapTestSettingsSchema,
)

router = APIRouter(
    prefix="/settings/ldap",
    tags=["LDAP Settings"],
)


@router.get(
    "",
    response_model=list[LdapSettingSchema],
    dependencies=[Depends(permission_checker(["settings:view"]))],
)
def read_ldap_settings(
    db: Session = Depends(get_db), current_user: CurrentUser = Depends(get_current_user)
):
    """
    Получает все настройки LDAP.
    Требует разрешения: `settings:view`
    """
    return services.get_all_ldap_settings(db=db)


@router.get("/is_enabled", response_model=LdapEnabledResponse)
def is_ldap_enabled(
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),  # Все аутентифицированные пользователи
):
    """
    Проверяет, включена ли интеграция с LDAP.
    Доступно любому аутентифицированному пользователю.
    """
    return LdapEnabledResponse(enabled=services.is_ldap_enabled(db=db))


@router.post(
    "/test",
    response_model=LdapTestResultSchema,
    dependencies=[Depends(permission_checker(["settings:update"]))],
)
def test_ldap_settings(
    settings_data: LdapTestSettingsSchema,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Тестирует настройки LDAP без их сохранения.
    Требует разрешения: `settings:update`
    """
    return services.test_ldap_connection(db=db, settings_data=settings_data.settings)


@router.get(
    "/{key}",
    response_model=LdapSettingSchema,
    dependencies=[Depends(permission_checker(["settings:view"]))],
)
def read_ldap_setting(
    key: str, db: Session = Depends(get_db), current_user: CurrentUser = Depends(get_current_user)
):
    """
    Получает одну настройку LDAP по ключу.
    Требует разрешения: `settings:view`
    """
    db_setting = services.get_ldap_setting_by_key(db=db, key=key)
    if db_setting is None:
        raise HTTPException(status_code=404, detail="Setting not found")
    return db_setting


@router.put(
    "/{key}",
    response_model=LdapSettingSchema,
    dependencies=[Depends(permission_checker(["settings:update"]))],
)
def update_ldap_setting(
    key: str,
    setting: LdapSettingUpdate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Обновляет настройку LDAP.
    Требует разрешения: `settings:update`
    """
    db_setting = services.get_ldap_setting_by_key(db=db, key=key)
    if db_setting is None:
        raise HTTPException(status_code=404, detail="Setting not found")

    updated_setting = services.update_ldap_setting(db=db, key=key, value=setting.value)

    return updated_setting


@router.patch(
    "",
    response_model=list[LdapSettingSchema],
    dependencies=[Depends(permission_checker(["settings:update"]))],
)
def update_ldap_settings_bulk(
    bulk_data: LdapBulkUpdateSchema,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Массовое обновление настроек LDAP.
    Требует разрешения: `settings:update`
    """
    result = services.update_ldap_settings_bulk(db=db, settings_dict=bulk_data.settings)

    return result
