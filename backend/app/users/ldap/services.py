import logging
import ssl
import uuid
from typing import Optional, Tuple, Any, List

from ldap3 import Server, Connection, ALL, Tls, SIMPLE
from sqlalchemy.orm import Session

from app.users.models import User
from app.settings.ldap import services as ldap_settings_service

logger = logging.getLogger(__name__)

# OID для Active Directory (в Root DSE)
AD_OID = "1.2.840.113556.1.4.800"


def normalize_object_guid(value) -> str:
    """
    Нормализует значение objectGUID (байты или строка) в строковое представление UUID.
    """
    if isinstance(value, bytes):
        return str(uuid.UUID(bytes_le=value))
    if isinstance(value, str):
        return str(uuid.UUID(value.strip('{}')))
    raise ValueError(f"Unsupported objectGUID type: {type(value)}")


def connect_to_ldap(db: Session, use_admin: bool = True) -> Tuple[Optional[Connection], Optional[str]]:
    """
    Устанавливает соединение с LDAP сервером на основе настроек из БД.
    
    Returns:
        Tuple[Optional[Connection], Optional[str]]: (объект соединения, тип сервера: 'ad' или 'openldap')
    """
    # 1. Получаем настройки
    ldap_uri = ldap_settings_service.get_ldap_setting_value(db, "LDAP_URI")
    
    if not ldap_uri:
        logger.error("LDAP_URI is not configured.")
        return None, None

    # Определение использования TLS по протоколу в URI
    use_tls = ldap_uri.lower().startswith("ldaps://")

    try:
        # 2. Настройка TLS если нужно
        tls_config = None
        if use_tls:
            # В простейшем случае разрешаем самоподписанные сертификаты для гибкости
            tls_config = Tls(validate=ssl.CERT_NONE, version=ssl.PROTOCOL_TLSv1_2)
        
        server = Server(ldap_uri, use_ssl=use_tls, tls=tls_config, get_info=ALL)
        
        # 3. Подключение
        if use_admin:
            bind_dn = ldap_settings_service.get_ldap_setting_value(db, "LDAP_BIND_DN")
            bind_password = ldap_settings_service.get_ldap_setting_value(db, "LDAP_BIND_PASSWORD")
            
            if not bind_dn or not bind_password:
                logger.error("LDAP Admin credentials (DN/Password) are not configured.")
                return None, None
                
            conn = Connection(
                server, 
                user=bind_dn, 
                password=bind_password, 
                authentication=SIMPLE,
                auto_bind=True
            )
        else:
            # Анонимное или неавторизованное подключение (только для получения инфо)
            conn = Connection(server, auto_bind=True)

        # 4. Автоопределение типа сервера
        server_type = "openldap" # По умолчанию
        if server.info and hasattr(server.info, 'other') and server.info.other:
            other_info = server.info.other
            if 'forestFunctionality' in other_info:
                server_type = "ad"
                logger.info("LDAP Server detected as: Active Directory (via rootDSE forestFunctionality)")
            elif 'vendorName' in other_info and 'microsoft' in other_info['vendorName'][0].lower():
                server_type = "ad"
                logger.info("LDAP Server detected as: Active Directory (via vendor name)")
            else:
                logger.info("LDAP Server detected as: OpenLDAP (or compatible)")
        else:
            # Fallback for safety, though get_info=ALL should always populate this
            logger.warning("Could not determine LDAP server type from server.info. Falling back to OpenLDAP.")

        return conn, server_type

    except Exception as e:
        logger.error(f"Failed to connect to LDAP: {str(e)}")
        return None, None


def _get_uuid_from_entry(entry: Any, server_type: str) -> Optional[str]:
    """
    Извлекает UUID из записи LDAP в зависимости от типа сервера.
    """
    try:
        if server_type == "ad":
            if not hasattr(entry, 'objectGUID'):
                logger.error("LDAP entry for AD is missing objectGUID attribute.")
                return None
            
            if not entry.objectGUID.raw_values:
                logger.error("objectGUID has no raw values.")
                return None

            raw_guid = entry.objectGUID.raw_values[0]
            
            try:
                return normalize_object_guid(raw_guid)
            except ValueError as e:
                logger.error(f"Error normalizing objectGUID: {e}, value: {raw_guid}")
                return None
        else:
            if not hasattr(entry, 'entryUUID'):
                logger.error("LDAP entry for OpenLDAP is missing entryUUID attribute.")
                return None
            return str(entry.entryUUID.value)
    except Exception as e:
        logger.error(f"Failed to extract UUID from LDAP entry: {str(e)}")
        return None


def authenticate_ldap_user(
    db: Session, 
    login: str, 
    password: str, 
    ldap_id: Optional[str] = None
) -> Optional[Tuple[Any, str]]:
    """
    Аутентифицирует пользователя в LDAP методом Search and Bind.
    Если передан ldap_id, поиск ведется по нему.
    
    Returns:
        Optional[Tuple[Any, str]]: (данные_пользователя, тип_сервера) или None
    """
    conn, server_type = connect_to_ldap(db, use_admin=True)
    if not conn:
        return None

    try:
        # 1. Формируем фильтр поиска
        search_base = ldap_settings_service.get_ldap_setting_value(db, "LDAP_BASE_DN")
        user_filter = ldap_settings_service.get_ldap_setting_value(db, "LDAP_USER_FILTER")
        
        if not search_base:
            logger.error("LDAP_BASE_DN is not configured.")
            return None

        # Определяем атрибуты поиска
        if server_type == "ad":
            login_attr = "sAMAccountName"
            uuid_attr = "objectGUID"
        else:
            login_attr = "uid"
            uuid_attr = "entryUUID"

        if ldap_id:
            # Если есть UUID, ищем по нему (надежнее при смене логина)
            if server_type == "ad":
                # Для AD поиск по бинарному GUID требует особого формата
                guid_bytes = uuid.UUID(ldap_id).bytes_le
                core_filter = f"({uuid_attr}=" + "".join([f"\\{b:02x}" for b in guid_bytes]) + ")"
            else:
                core_filter = f"({uuid_attr}={ldap_id})"
        else:
            core_filter = f"({login_attr}={login})"

        # Объединяем с дополнительным фильтром, если он задан
        if user_filter:
            if user_filter.startswith("(&"):
                # Если уже есть (&...), вставляем наш фильтр внутрь
                search_filter = user_filter[:-1] + core_filter + ")"
            else:
                # Иначе, оборачиваем оба фильтра в (&...)
                if not user_filter.startswith("("):
                    user_filter = f"({user_filter})"
                search_filter = f"(&{user_filter}{core_filter})"
        else:
            search_filter = core_filter

        # 2. Ищем пользователя
        conn.search(
            search_base=search_base,
            search_filter=search_filter,
            attributes=['*', '+']
        )

        if not conn.entries:
            logger.warning(f"LDAP user not found: {search_filter}")
            return None

        user_entry = conn.entries[0]
        user_dn = user_entry.entry_dn

        # 3. Пытаемся сделать Bind под пользователем (проверка пароля)
        user_conn = Connection(
            conn.server, 
            user=user_dn, 
            password=password, 
            authentication=SIMPLE
        )
        
        if not user_conn.bind():
            logger.warning(f"LDAP authentication failed for DN: {user_dn}")
            return None

        return user_entry, server_type

    except Exception as e:
        logger.error(f"Error during LDAP authentication: {str(e)}")
        return None
    finally:
        if conn:
            conn.unbind()


def get_ldap_user_info(entry: Any, server_type: str) -> Optional[dict]:
    """
    Преобразует запись LDAP в словарь атрибутов пользователя.
    """
    try:
        ldap_id = _get_uuid_from_entry(entry, server_type)
        if not ldap_id:
            return None

        username = None
        full_name = None
        email = None

        if server_type == "ad":
            if hasattr(entry, 'sAMAccountName'):
                username = entry.sAMAccountName.value
            if hasattr(entry, 'displayName'):
                full_name = entry.displayName.value
            if not full_name and hasattr(entry, 'cn'):
                full_name = entry.cn.value
        else: # openldap
            if hasattr(entry, 'uid'):
                username = entry.uid.value
            if hasattr(entry, 'cn'):
                full_name = entry.cn.value
            if not full_name and hasattr(entry, 'uid'):
                full_name = entry.uid.value
        
        if hasattr(entry, 'mail') and entry.mail.value:
            email = entry.mail.value

        if not username or not full_name:
            logger.error(f"Could not determine username or full name from LDAP entry. Username: {username}, Full Name: {full_name}")
            return None

        return {
            "ldap_id": ldap_id,
            "ldap_dn": entry.entry_dn,
            "login": username, # Standardized key
            "email": email,
            "full_name": full_name
        }
    except Exception as e:
        logger.error(f"Error parsing LDAP entry info: {str(e)}")
        return None

def create_or_update_ldap_user(db: Session, user_info: dict) -> Optional[User]:
    """
    Creates or updates a user based on LDAP info.
    Common logic used by both Batch Sync and Login flows.
    """
    ldap_id = user_info.get("ldap_id")
    login = user_info.get("login")
    
    if not ldap_id and not login:
        logger.warning(f"Skipping user with missing ID and Login: {user_info}")
        return None

    # 1. Try to find existing user by LDAP ID
    user = None
    if ldap_id:
        user = db.query(User).filter(User.ldap_id == ldap_id).first()
    
    # 2. Fallback: Find by login (if not found by ID)
    if not user and login:
        user = db.query(User).filter(User.login == login.lower()).first()

    if user:
        # UPDATE
        # Critical check: Only update if user is already LDAP type.
        if user.type != "ldap":
             logger.warning(f"Skipping sync/update for user '{login}' matching LDAP user but has type '{user.type}'.")
             return user # Return existing user but do not update it

        if "login" in user_info and user_info["login"]:
            user.login = user_info["login"].lower()
        if "full_name" in user_info:
            user.name = user_info["full_name"]

        if "dn" in user_info:
            user.ldap_dn = user_info["dn"]
        # Handle "ldap_dn" key from backend service or "dn" from worker
        elif "ldap_dn" in user_info:
             user.ldap_dn = user_info["ldap_dn"]
        
        if ldap_id and user.ldap_id != ldap_id:
            user.ldap_id = ldap_id
        
        # Active Status Handling
        # Note: Login flow typically implies active (since they logged in), 
        # but worker flow might pass status.
        if "is_active" in user_info:
             raw_status = user_info["is_active"]
             if isinstance(raw_status, bool):
                 user.is_active = raw_status
             elif isinstance(raw_status, int):
                 is_active = not ((raw_status & 2) == 2)
                 user.is_active = is_active
             elif str(raw_status).lower() in ["false", "0", "disabled"]:
                 user.is_active = False

    else:
        # CREATE
        if not login:
             return None
        
        is_active = True
        if "is_active" in user_info:
             raw_status = user_info["is_active"]
             if isinstance(raw_status, bool):
                 is_active = raw_status
             elif isinstance(raw_status, int):
                 is_active = not ((raw_status & 2) == 2)
             elif str(raw_status).lower() in ["false", "0", "disabled"]:
                 is_active = False

        user = User(
            login=login.lower(),
            name=user_info.get("full_name") or login,

            ldap_id=ldap_id,
            ldap_dn=user_info.get("dn") or user_info.get("ldap_dn"),
            type="ldap",
            is_active=is_active
        )
        db.add(user)
    
    # We do NOT commit here to allow callers to batch commits or rollback
    return user


def sync_ldap_users_batch(db: Session, users_data: List[dict]) -> dict:
    """
    Synchronizes a batch of LDAP users.
    Returns stats: {'created': int, 'updated': int, 'errors': int}
    """
    stats = {"created": 0, "updated": 0, "errors": 0}
    
    for user_info in users_data:
        try:
            # Check existence before to know if it's create or update for stats
            # Or simplified: verify if ID exists in a set?
            # For accurate stats, we can check state of object returned.
            # But SQLAlchemy object state inspection is complex given we flush/commit later.
            # Let's simple check:
            
            ldap_id = user_info.get("ldap_id")
            login = user_info.get("login")
            exists = False
            if ldap_id:
                 exists = db.query(User).filter(User.ldap_id == ldap_id).count() > 0
            elif login:
                 exists = db.query(User).filter(User.login == login.lower()).count() > 0
            
            user = create_or_update_ldap_user(db, user_info)
            
            if user:
                if exists:
                    stats["updated"] += 1
                else:
                    stats["created"] += 1
            else:
                stats["errors"] += 1
                
        except Exception as e:
            logger.error(f"Error syncing user {user_info.get('login')}: {e}")
            stats["errors"] += 1
            
    db.commit()
    return stats
