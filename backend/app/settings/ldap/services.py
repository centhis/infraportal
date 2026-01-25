import json
from typing import Any, List, Optional

from sqlalchemy.orm import Session
from ldap3 import Server, Connection, ALL
from ldap3.core.exceptions import LDAPException, LDAPBindError, LDAPInvalidFilterError, LDAPInvalidDnError

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


def get_ldap_setting_by_key(db: Session, key: str) -> Optional[LdapSetting]:
    """
    Получает объект LDAP Setting из БД по ее уникальному ключу.
    """
    return db.query(LdapSetting).filter(LdapSetting.key == key).first()


def get_all_ldap_settings(db: Session) -> List[LdapSetting]:
    """
    Получает список всех LDAP Settings из БД.
    """
    return db.query(LdapSetting).all()


def update_ldap_setting(db: Session, key: str, value: Any) -> LdapSetting:
    """
    Обновляет значение существующей LDAP Setting по ее ключу.
    Перед сохранением, если обновляется пароль, он должен быть зашифрован.
    """
    db_setting = db.query(LdapSetting).filter(LdapSetting.key == key).first()
    if not db_setting:
        return None

    # Encrypt LDAP_BIND_PASSWORD if it's being updated
    if key == "LDAP_BIND_PASSWORD" and value is not None:
        db_setting.value = encrypt_value(value)
    else:
        # Convert value to string for storage
        if isinstance(value, (dict, list)):
            db_setting.value = json.dumps(value)
        else:
            db_setting.value = str(value)

    db.add(db_setting)
    db.commit()
    db.refresh(db_setting)
    return db_setting


def update_ldap_settings_bulk(db: Session, settings_dict: dict) -> List[LdapSetting]:
    """
    Массово обновляет значения LDAP настроек.
    """
    updated_settings = []
    for key, value in settings_dict.items():
        db_setting = db.query(LdapSetting).filter(LdapSetting.key == key).first()
        if db_setting:
            if key == "LDAP_BIND_PASSWORD" and value is not None:
                # Если нам прислали ******** (как мы отдаем в API для защищенных полей), 
                # и это поле sensitive, то не обновляем его.
                # Но фронтенд должен присылать только если значение реально изменилось.
                if value != "********":
                    db_setting.value = encrypt_value(value)
            else:
                if isinstance(value, (dict, list)):
                    db_setting.value = json.dumps(value)
                else:
                    db_setting.value = str(value)
            db.add(db_setting)
            updated_settings.append(db_setting)
    
    db.commit()
    for s in updated_settings:
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
            # Decrypt the password for internal usage
            return decrypt_value(db_setting.value)
        return _convert_value_to_type(db_setting.value, db_setting.type)
    return None


def test_ldap_connection(settings_data: dict) -> LdapTestResultSchema:
    """
    Tests the LDAP connection with the provided settings.
    """
    uri = settings_data.get("LDAP_URI")
    bind_dn = settings_data.get("LDAP_BIND_DN")
    bind_password = settings_data.get("LDAP_BIND_PASSWORD")
    base_dn = settings_data.get("LDAP_BASE_DN")
    user_filter = settings_data.get("LDAP_USER_FILTER")

    if not all([uri, bind_dn, base_dn, user_filter]):
        missing = [k for k, v in locals().items() if not v and k != 'bind_password']
        return LdapTestResultSchema(success=False, message=f"Missing required LDAP settings: {', '.join(missing)}")

    try:
        server = Server(uri, get_info=ALL)
        # Set a reasonable timeout
        conn = Connection(server, user=bind_dn, password=bind_password, auto_bind=False, receive_timeout=5)

        # 1. Test connection and bind
        if not conn.bind():
            # This will raise LDAPBindError on failure, but we check for safety
            # The error info is in conn.result
            error_message = conn.result.get('description', 'Unknown bind error')
            return LdapTestResultSchema(
                success=False,
                message=f"Bind failed. Check LDAP_BIND_DN or LDAP_BIND_PASSWORD. Server says: {error_message}"
            )

        # 2. Test search with BASE_DN and USER_FILTER
        # We only need to know if the search can be performed and finds at least one entry.
        search_result = conn.search(
            search_base=base_dn,
            search_filter=user_filter,
            search_scope='SUBTREE',
            attributes=['objectClass'],
            size_limit=1
        )

        if not search_result:
             # Search failed, but no exception. Maybe just no users found?
            return LdapTestResultSchema(
                success=False,
                message=(
                    "Search executed successfully but returned no results. "
                    "Verify LDAP_BASE_DN and LDAP_USER_FILTER are correct and that there are users matching the criteria."
                )
            )

    except LDAPBindError as e:
        return LdapTestResultSchema(success=False, message=f"Bind Error (check DN/password): {e}")
    except LDAPInvalidDnError as e:
        return LdapTestResultSchema(success=False, message=f"Invalid DN syntax (check LDAP_BASE_DN or LDAP_BIND_DN): {e}")
    except LDAPInvalidFilterError as e:
        return LdapTestResultSchema(success=False, message=f"Invalid filter syntax (check LDAP_USER_FILTER): {e}")
    except LDAPException as e:
        return LdapTestResultSchema(success=False, message=f"LDAP Error. Check LDAP_URI and connectivity. Details: {e}")
    except Exception as e:
        # Catch any other unexpected errors
        return LdapTestResultSchema(success=False, message=f"An unexpected error occurred: {e}")
    finally:
        if 'conn' in locals() and conn.bound:
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
