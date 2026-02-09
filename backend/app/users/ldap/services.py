import logging
import uuid
from typing import Any

from ldap3 import Connection
from sqlalchemy.orm import Session

from app.core import ldap_config, ldap_service
from app.users.models import User

logger = logging.getLogger(__name__)


def normalize_object_guid(value) -> str:
    """
    Нормализует значение objectGUID (байты или строка) в строковое представление UUID.
    """
    if isinstance(value, bytes):
        return str(uuid.UUID(bytes_le=value))
    if isinstance(value, str):
        return str(uuid.UUID(value.strip("{}")))
    raise ValueError(f"Unsupported objectGUID type: {type(value)}")


def connect_to_ldap(db: Session, use_admin: bool = True) -> tuple[Connection | None, str | None]:
    """
    Устанавливает соединение с LDAP сервером на основе настроек из БД.

    Returns:
        Tuple[Optional[Connection], Optional[str]]: (объект соединения, тип сервера: 'ad' или 'openldap')
    """
    # 1. Получаем настройки
    ldap_uri = ldap_config.get_ldap_setting_value(db, "LDAP_URI")

    if not ldap_uri:
        logger.error("LDAP_URI is not configured.")
        return None, None

    # Получаем настройку проверки TLS (по умолчанию True)
    tls_verify_setting = ldap_config.get_ldap_setting_value(db, "LDAP_TLS_VERIFY")
    tls_verify = True
    if tls_verify_setting is not None:
        # ldap_config возвращает типизированное значение, если оно bool
        if isinstance(tls_verify_setting, bool):
            tls_verify = tls_verify_setting
        else:
            tls_verify = str(tls_verify_setting).lower() == "true"

    try:
        # 2. Создаем сервер (используя новую логику из core)
        # use_tls=None означает определить автоматически по схеме (ldaps://)
        server = ldap_service.create_ldap_server(ldap_uri, use_tls=None, tls_verify=tls_verify)

        # 3. Подключение
        conn = None
        if use_admin:
            bind_dn = ldap_config.get_ldap_setting_value(db, "LDAP_BIND_DN")
            bind_password = ldap_config.get_ldap_setting_value(db, "LDAP_BIND_PASSWORD")

            if not bind_dn or not bind_password:
                logger.error("LDAP Admin credentials (DN/Password) are not configured.")
                return None, None

            # Используем фабрику соединений из core
            conn = ldap_service.create_ldap_connection(
                server, bind_dn=bind_dn, bind_password=bind_password, auto_bind=True
            )
        else:
            # Анонимное или неавторизованное подключение (только для получения инфо)
            conn = ldap_service.create_ldap_connection(server, auto_bind=True)

        # 4. Автоопределение типа сервера (используя новую логику с fallback на connection)
        server_type = ldap_service.detect_server_type(server, connection=conn)

        return conn, server_type

    except Exception as e:
        logger.error(f"Failed to connect to LDAP: {str(e)}")
        if "conn" in locals() and conn and conn.bound:
            conn.unbind()
        return None, None


def _get_uuid_from_entry(entry: Any, server_type: str) -> str | None:
    """
    Извлекает UUID из записи LDAP в зависимости от типа сервера.
    """
    try:
        if server_type == "ad":
            if not hasattr(entry, "objectGUID"):
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
            if not hasattr(entry, "entryUUID"):
                logger.error("LDAP entry for OpenLDAP is missing entryUUID attribute.")
                return None
            return str(entry.entryUUID.value)
    except Exception as e:
        logger.error(f"Failed to extract UUID from LDAP entry: {str(e)}")
        return None


def authenticate_ldap_user(
    db: Session, login: str, password: str, ldap_id: str | None = None
) -> tuple[Any, str] | None:
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
        search_base = ldap_config.get_ldap_setting_value(db, "LDAP_BASE_DN")
        user_filter = ldap_config.get_ldap_setting_value(db, "LDAP_USER_FILTER")

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
        conn.search(search_base=search_base, search_filter=search_filter, attributes=["*", "+"])

        if not conn.entries:
            logger.warning(f"LDAP user not found: {search_filter}")
            return None

        user_entry = conn.entries[0]
        user_dn = user_entry.entry_dn

        # 3. Пытаемся сделать Bind под пользователем (проверка пароля)
        # Здесь мы создаем новый Connection вручную, так как нам нужна аутентификация конкретного юзера
        # Но мы можем использовать сервер, созданный ранее
        user_conn = ldap_service.create_ldap_connection(
            conn.server, bind_dn=user_dn, bind_password=password, auto_bind=False
        )

        # Ручной bind для проверки
        if not user_conn.bind():
            logger.warning(f"LDAP authentication failed for DN: {user_dn}")
            return None

        # Успешная аутентификация
        # Важно: user_conn можно закрыть, нам нужны только данные из админского conn
        user_conn.unbind()

        return user_entry, server_type

    except Exception as e:
        logger.error(f"Error during LDAP authentication: {str(e)}")
        return None
    finally:
        if conn:
            conn.unbind()


def get_ldap_user_info(entry: Any, server_type: str) -> dict | None:
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
            if hasattr(entry, "sAMAccountName"):
                username = entry.sAMAccountName.value
            if hasattr(entry, "displayName"):
                full_name = entry.displayName.value
            if not full_name and hasattr(entry, "cn"):
                full_name = entry.cn.value
        else:  # openldap (оставляем как есть, это имя типа)
            if hasattr(entry, "uid"):
                username = entry.uid.value
            if hasattr(entry, "cn"):
                full_name = entry.cn.value
            if not full_name and hasattr(entry, "uid"):
                full_name = entry.uid.value

        if hasattr(entry, "mail") and entry.mail.value:
            email = entry.mail.value

        if not username or not full_name:
            logger.error(
                f"Could not determine username or full name from LDAP entry. Username: {username}, Full Name: {full_name}"
            )
            return None

        return {
            "ldap_id": ldap_id,
            "ldap_dn": entry.entry_dn,
            "login": username,  # Стандартизированный ключ
            "email": email,
            "full_name": full_name,
        }
    except Exception as e:
        logger.error(f"Error parsing LDAP entry info: {str(e)}")
        return None


def create_or_update_ldap_user(db: Session, user_info: dict) -> User | None:
    """
    Создает или обновляет пользователя на основе информации из LDAP.
    Общая логика для пакетной синхронизации и входа в систему.
    """
    ldap_id = user_info.get("ldap_id")
    login = user_info.get("login")

    if not ldap_id and not login:
        logger.warning(f"Skipping user with missing ID and Login: {user_info}")
        return None

    # 1. Попытаться найти существующего пользователя по LDAP ID
    user = None
    if ldap_id:
        user = db.query(User).filter(User.ldap_id == ldap_id).first()

    # 2. Резервный вариант: найти по логину (если не найдено по ID)
    if not user and login:
        user = db.query(User).filter(User.login == login.lower()).first()

    if user:
        # ОБНОВЛЕНИЕ
        # Критическая проверка: Обновлять только если пользователь уже типа LDAP.
        if user.type != "ldap":
            logger.warning(
                f"Skipping sync/update for user '{login}' matching LDAP user but has type '{user.type}'."
            )
            return user  # Вернуть существующего пользователя, но не обновлять его

        if "login" in user_info and user_info["login"]:
            user.login = user_info["login"].lower()
        if "full_name" in user_info:
            user.name = user_info["full_name"]

        if "dn" in user_info:
            user.ldap_dn = user_info["dn"]
        # Обработка ключа "ldap_dn" от бэкенд-сервиса или "dn" от воркера
        elif "ldap_dn" in user_info:
            user.ldap_dn = user_info["ldap_dn"]

        if ldap_id and user.ldap_id != ldap_id:
            user.ldap_id = ldap_id

        # Обработка статуса активности
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
        # СОЗДАНИЕ
        if not login:
            return None

        is_active = True
        if "is_active" in user_info:
            raw_status = user_info["is_active"]
            if isinstance(raw_status, bool):
                is_active = raw_status
            elif isinstance(raw_status, int):
                is_active = not ((raw_status & 2) == 2)
                user.is_active = is_active
            elif str(raw_status).lower() in ["false", "0", "disabled"]:
                is_active = False

        user = User(
            login=login.lower(),
            name=user_info.get("full_name") or login,
            ldap_id=ldap_id,
            ldap_dn=user_info.get("dn") or user_info.get("ldap_dn"),
            type="ldap",
            is_active=is_active,
        )
        db.add(user)

    # Мы НЕ делаем здесь commit, чтобы позволить вызывающим делать пакетные коммиты или откат
    return user


def sync_ldap_users_batch(db: Session, users_data: list[dict]) -> dict:
    """
    Синхронизирует пакет пользователей LDAP.
    Выполняет полный цикл: создание, обновление и деактивацию отсутствующих.

    Returns:
        dict: Статистика: {'created': int, 'updated': int, 'unchanged': int, 'deactivated': int, 'errors': int}
    """
    stats = {"created": 0, "updated": 0, "unchanged": 0, "deactivated": 0, "errors": 0}
    current_ldap_ids = set()

    # 1. Создание и обновление
    for user_info in users_data:
        try:
            ldap_id = user_info.get("ldap_id")
            login = user_info.get("login")

            if not ldap_id and not login:
                logger.warning(f"Skipping LDAP user with no ID or Login: {user_info}")
                stats["errors"] += 1
                continue

            # Ищем существующего пользователя для статистики
            existing_user = None
            if ldap_id:
                existing_user = db.query(User).filter(User.ldap_id == ldap_id).first()
            if not existing_user and login:
                existing_user = db.query(User).filter(User.login == login.lower()).first()

            old_values = {}
            if existing_user:
                old_values = {
                    "login": existing_user.login,
                    "name": existing_user.name,
                    "ldap_dn": existing_user.ldap_dn,
                    "ldap_id": existing_user.ldap_id,
                    "is_active": existing_user.is_active,
                }

            # Выполняем создание/обновление
            user = create_or_update_ldap_user(db, user_info)

            if user:
                current_ldap_ids.add(user.ldap_id)
                if existing_user:
                    # Проверяем на изменения
                    new_values = {
                        "login": user.login,
                        "name": user.name,
                        "ldap_dn": user.ldap_dn,
                        "ldap_id": user.ldap_id,
                        "is_active": user.is_active,
                    }
                    if old_values != new_values:
                        stats["updated"] += 1
                    else:
                        stats["unchanged"] += 1
                else:
                    stats["created"] += 1
            else:
                stats["errors"] += 1

        except Exception as e:
            logger.error(f"Error syncing user {user_info.get('login')}: {e}")
            stats["errors"] += 1

    # 2. Деактивация отсутствующих пользователей (только типа ldap)
    try:
        if current_ldap_ids:
            # Находим всех LDAP пользователей, которые активны, но их нет в текущем списке из LDAP
            users_to_deactivate = (
                db.query(User)
                .filter(
                    User.type == "ldap",
                    User.is_active.is_(True),
                    User.ldap_id.notin_(current_ldap_ids),
                )
                .all()
            )

            for u in users_to_deactivate:
                u.is_active = False
                stats["deactivated"] += 1
                logger.info(f"Deactivated user '{u.login}' (not found in LDAP sync batch)")

    except Exception as e:
        logger.error(f"Error during users deactivation: {e}")
        stats["errors"] += 1

    db.commit()
    return stats
