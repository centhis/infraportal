import json
from typing import Any

from ldap3.core.exceptions import (
    LDAPBindError,
    LDAPException,
    LDAPInvalidDnError,
    LDAPInvalidFilterError,
)
from sqlalchemy.orm import Session

from app.core import ldap_service
from app.core.scheduling import scheduler
from app.core.security import decrypt_value, encrypt_value
from app.settings.ldap.models import LdapSetting
from app.settings.ldap.schemas import LdapTestResultSchema


def _convert_value_to_type(value: str, type_str: str) -> Any:
    """
    Преобразует строковое значение в соответствующий Python-тип.
    """
    if type_str == "bool":
        return value.lower() == "true"
    elif type_str == "int":
        return int(value)
    elif type_str == "float":
        return float(value)
    elif type_str == "json":
        return json.loads(value)
    return value


def get_ldap_setting_by_key(db: Session, key: str) -> LdapSetting | None:
    """
    Получает объект LDAP Setting из БД по ее уникальному ключу.
    Если ключ LDAP_SYNC_SCHEDULE, возвращает виртуальный объект из планировщика.
    """
    if key == "LDAP_SYNC_SCHEDULE":
        task_info = scheduler.get_periodic_task_info(db, "Users: LDAP Sync")
        if task_info:
            return LdapSetting(
                id=task_info["id"],
                key="LDAP_SYNC_SCHEDULE",
                value=task_info["cron_schedule"],
                type="string",
                is_sensitive=False,
            )
        return None

        return None

    # Для остальных настроек ищем в таблице
    return db.query(LdapSetting).filter(LdapSetting.key == key).first()


def get_all_ldap_settings(db: Session) -> list[LdapSetting]:
    """
    Получает список всех LDAP Settings из БД, включая виртуальные из планировщика.
    """
    # Исключаем виртуальные настройки из выборки БД, чтобы избежать конфликтов
    settings_list = (
        db.query(LdapSetting).filter(LdapSetting.key != "LDAP_SYNC_SCHEDULE").all()
    )

    # Добавить виртуальную настройку расписания
    task_info = scheduler.get_periodic_task_info(db, "Users: LDAP Sync")
    if task_info:
        # Проверяем, нет ли уже в БД (на случай переходного периода)
        if not any(s.key == "LDAP_SYNC_SCHEDULE" for s in settings_list):
            settings_list.append(
                LdapSetting(
                    id=task_info["id"],
                    key="LDAP_SYNC_SCHEDULE",
                    value=task_info["cron_schedule"],
                    type="string",
                    is_sensitive=False,
                )
            )

    return settings_list


def update_ldap_setting(db: Session, key: str, value: Any) -> LdapSetting:
    """
    Обновляет значение существующей LDAP Setting по ее ключу.
    Если обновляется LDAP_SYNC_SCHEDULE, обновляет периодическую задачу.
    """
    if key == "LDAP_SYNC_SCHEDULE":
        # Обновить расписание в планировщике
        # Нам нужно включено ли LDAP сейчас, чтобы не сбросить флаг enabled
        enabled = is_ldap_enabled(db)
        task = scheduler.create_or_update_periodic_task(
            db,
            task_name="Users: LDAP Sync",
            task_func="tasks.dispatch",
            cron_schedule=str(value),
            kwargs={
                "task_type": "users:sync_ldap",
                "schedule_id": "Users: LDAP Sync",
            },
            enabled=enabled,
        )
        db.commit()
        return LdapSetting(
            id=task.id, key="LDAP_SYNC_SCHEDULE", value=str(value), type="string", is_sensitive=False
        )

    db_setting = db.query(LdapSetting).filter(LdapSetting.key == key).first()
    if not db_setting:
        return None

    # Зашифровать LDAP_BIND_PASSWORD, если он обновляется
    if key == "LDAP_BIND_PASSWORD" and value is not None:
        db_setting.value = encrypt_value(value)
    else:
        # Преобразовать значение в строку для хранения
        if isinstance(value, (dict, list)):
            db_setting.value = json.dumps(value)
        elif isinstance(value, bool):
            db_setting.value = str(value).lower()
        else:
            db_setting.value = str(value)

    db.add(db_setting)

    # Если меняется LDAP_ENABLED, синхронизировать с планировщиком
    if key == "LDAP_ENABLED":
        enabled = value if isinstance(value, bool) else str(value).lower() == "true"
        task_info = scheduler.get_periodic_task_info(db, "Users: LDAP Sync")
        if task_info:
            scheduler.create_or_update_periodic_task(
                db,
                task_name="Users: LDAP Sync",
                task_func="tasks.dispatch",
                cron_schedule=task_info["cron_schedule"],
                kwargs={
                    "task_type": "users:sync_ldap",
                    "schedule_id": "Users: LDAP Sync",
                },
                enabled=enabled,
            )

    db.commit()
    if db_setting:
        db.refresh(db_setting)
    return db_setting


def update_ldap_settings_bulk(db: Session, settings_dict: dict) -> list[LdapSetting]:
    """
    Массово обновляет значения LDAP настроек, включая виртуальные.
    """
    updated_settings = []
    schedule_value = settings_dict.get("LDAP_SYNC_SCHEDULE")
    enabled_value = settings_dict.get("LDAP_ENABLED")

    for key, value in settings_dict.items():
        if key == "LDAP_SYNC_SCHEDULE":
            continue

        db_setting = db.query(LdapSetting).filter(LdapSetting.key == key).first()
        if db_setting:
            if key == "LDAP_BIND_PASSWORD" and value is not None:
                if value != "********":
                    db_setting.value = encrypt_value(value)
            else:
                if isinstance(value, (dict, list)):
                    db_setting.value = json.dumps(value)
                elif isinstance(value, bool):
                    db_setting.value = str(value).lower()
                else:
                    db_setting.value = str(value)
            db.add(db_setting)
            updated_settings.append(db_setting)

    # Синхронизация с планировщиком
    if schedule_value is not None or enabled_value is not None:
        task_info = scheduler.get_periodic_task_info(db, "Users: LDAP Sync")
        new_enabled = (
            (enabled_value if isinstance(enabled_value, bool) else str(enabled_value).lower() == "true")
            if enabled_value is not None
            else is_ldap_enabled(db)
        )
        new_schedule = schedule_value or (task_info["cron_schedule"] if task_info else "0 0 * * *")

        task = scheduler.create_or_update_periodic_task(
            db,
            task_name="Users: LDAP Sync",
            task_func="tasks.dispatch",
            cron_schedule=new_schedule,
            kwargs={
                "task_type": "users:sync_ldap",
                "schedule_id": "Users: LDAP Sync",
            },
            enabled=new_enabled,
        )

        if schedule_value is not None:
            updated_settings.append(
                LdapSetting(
                    id=task.id,
                    key="LDAP_SYNC_SCHEDULE",
                    value=schedule_value,
                    type="string",
                    is_sensitive=False,
                )
            )

    db.commit()

    for s in updated_settings:
        # Рефрешим только те настройки, которые реально есть в таблице ldap_settings.
        # Настройка LDAP_SYNC_SCHEDULE является виртуальной и имеет ID от PeriodicTask,
        # поэтому её нельзя рефрешить из таблицы ldap_settings.
        if s.id and s.id > 0 and s.key != "LDAP_SYNC_SCHEDULE":
            db.refresh(s)
            
    return updated_settings


def get_ldap_setting_value(db: Session, key: str) -> Any:
    """
    Вспомогательная функция для получения значения LDAP Setting по ключу с приведением типа.
    Перед возвратом значения для пароля, оно должно быть дешифровано.
    """
    db_setting = get_ldap_setting_by_key(db, key)
    if db_setting:
        if db_setting.key == "LDAP_BIND_PASSWORD" and db_setting.is_sensitive:
            # Расшифровать пароль для внутреннего использования
            return decrypt_value(db_setting.value)
        return _convert_value_to_type(db_setting.value, db_setting.type)
    return None


def test_ldap_connection(db: Session, settings_data: dict) -> LdapTestResultSchema:
    """
    Тестирует соединение с LDAP с предоставленными настройками.
    """
    uri = settings_data.get("LDAP_URI")
    bind_dn = settings_data.get("LDAP_BIND_DN")
    bind_password = settings_data.get("LDAP_BIND_PASSWORD")

    # Если пароль замаскирован, берем его из БД (с расшифровкой внутри get_ldap_setting_value)
    if bind_password == "********":
        bind_password = get_ldap_setting_value(db, "LDAP_BIND_PASSWORD")
    base_dn = settings_data.get("LDAP_BASE_DN")
    user_filter = settings_data.get("LDAP_USER_FILTER")

    # Получаем настройку проверки TLS (по умолчанию True)
    # Настройки приходят с фронтенда в settings_data
    tls_verify_raw = settings_data.get("LDAP_TLS_VERIFY")
    tls_verify = True
    if tls_verify_raw is not None:
         # Фронт может прислать boolean или строку
        if isinstance(tls_verify_raw, bool):
            tls_verify = tls_verify_raw
        else:
            tls_verify = str(tls_verify_raw).lower() == "true"

    if not all([uri, bind_dn, base_dn, user_filter]):
        missing = [k for k, v in locals().items() if not v and k != "bind_password"]
        return LdapTestResultSchema(
            success=False, message=f"Missing required LDAP settings: {', '.join(missing)}"
        )

    try:
        # Используем core сервис для создания сервера и соединения
        # use_tls=None -> автоматическое определение из схемы URI
        server = ldap_service.create_ldap_server(uri, use_tls=None, tls_verify=tls_verify)

        # 1. Проверка соединения и bind (auto_bind=False чтобы мы могли поймать ошибку bind отдельно)
        conn = ldap_service.create_ldap_connection(
            server, bind_dn=bind_dn, bind_password=bind_password, auto_bind=False, receive_timeout=5
        )

        if not conn.bind():
            # Эта ветка может не выполниться, если ldap library кинет исключение,
            # но обработаем result на всякий случай
            error_message = conn.result.get("description", "Unknown bind error")
            return LdapTestResultSchema(
                success=False,
                message=f"Bind failed. Check LDAP_BIND_DN or LDAP_BIND_PASSWORD. Server says: {error_message}",
            )

        # 2. Тестовый поиск с BASE_DN и USER_FILTER
        search_result = conn.search(
            search_base=base_dn,
            search_filter=user_filter,
            search_scope="SUBTREE",
            attributes=["objectClass"],
            size_limit=1,
        )

        if not search_result:
            return LdapTestResultSchema(
                success=False,
                message=(
                    "Search executed successfully but returned no results. "
                    "Verify LDAP_BASE_DN and LDAP_USER_FILTER are correct and that there are users matching the criteria."
                ),
            )

    except LDAPBindError as e:
        return LdapTestResultSchema(success=False, message=f"Bind Error (check DN/password): {e}")
    except LDAPInvalidDnError as e:
        return LdapTestResultSchema(
            success=False, message=f"Invalid DN syntax (check LDAP_BASE_DN or LDAP_BIND_DN): {e}"
        )
    except LDAPInvalidFilterError as e:
        return LdapTestResultSchema(
            success=False, message=f"Invalid filter syntax (check LDAP_USER_FILTER): {e}"
        )
    except LDAPException as e:
        return LdapTestResultSchema(
            success=False, message=f"LDAP Error. Check LDAP_URI and connectivity. Details: {e}"
        )
    except Exception as e:
        return LdapTestResultSchema(success=False, message=f"An unexpected error occurred: {e}")
    finally:
        if "conn" in locals() and conn.bound:
            conn.unbind()

    return LdapTestResultSchema(success=True, message="LDAP connection and search test successful.")


def is_ldap_enabled(db: Session) -> bool:
    """
    Проверяет, включена ли интеграция с LDAP.
    """
    setting = get_ldap_setting_by_key(db, "LDAP_ENABLED")
    if setting:
        return _convert_value_to_type(setting.value, setting.type)
    return False
