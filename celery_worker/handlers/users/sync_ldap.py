
import logging
import httpx
from task_registry import register_task_handler
from utils.users.ldap import connect_to_ldap, fetch_users
from config import settings

logger = logging.getLogger(__name__)


def sync_ldap_users_handler(execution_id: str, secrets: dict, **kwargs):
    """
    Обработчик для задачи 'users:sync_ldap'.
    Собирает пользователей из LDAP и возвращает их для постобработки бэкендом.
    """
    logger.info(f"Starting LDAP Fetch (Execution ID: {execution_id})")

    # --- Извлечение настроек из secrets ---
    ldap_uri = secrets.get("LDAP_URI")
    bind_dn = secrets.get("LDAP_BIND_DN")
    bind_password = secrets.get("LDAP_BIND_PASSWORD")
    base_dn = secrets.get("LDAP_BASE_DN")
    user_filter = secrets.get("LDAP_USER_FILTER")
    
    # TLS Verify: по умолчанию False, если не задано
    tls_verify = secrets.get("LDAP_TLS_VERIFY", False)
    
    # --- Валидация ---
    if not ldap_uri or not bind_dn or not base_dn:
        msg = "Missing required LDAP settings (URI, BIND_DN, or BASE_DN)."
        logger.error(msg)
        raise ValueError(msg)

    if not bind_password:
        msg = "LDAP_BIND_PASSWORD not found in provided secrets."
        logger.error(msg)
        raise ValueError(msg)

    # --- Подключение к LDAP ---
    logger.info(f"Connecting to LDAP: {ldap_uri} (tls_verify={tls_verify})")
    conn = connect_to_ldap(ldap_uri, bind_dn, bind_password, tls_verify=tls_verify)
    
    if not conn:
        raise ConnectionError("Failed to connect/bind to LDAP server.")
    
    try:
        # --- Получение пользователей ---
        logger.info(f"Fetching users from BaseDN: {base_dn}")
        users = fetch_users(conn, base_dn, user_filter)
        logger.info(f"Fetched {len(users)} users from LDAP.")

        # Возвращаем результат для бэкенда. 
        # Общая инфраструктура воркера (dispatch_task) сама отправит это в baceknd.
        return {"users": users}

    except Exception as e:
        logger.error(f"Error during LDAP fetch: {e}", exc_info=True)
        raise
    finally:
        if conn:
            conn.unbind()


# Регистрация обработчика
register_task_handler("users:sync_ldap", sync_ldap_users_handler)
