
import logging
import httpx
from task_registry import register_task_handler
from utils.users.ldap import connect_to_ldap, fetch_users
from config import settings

logger = logging.getLogger(__name__)

def sync_ldap_users_handler(execution_id: str, secrets: dict, **kwargs):
    """
    Handler for 'users:sync_ldap' task.
    """
    logger.info(f"Starting LDAP Sync (Execution ID: {execution_id})")

    # 1. Extract Settings
    ldap_uri = kwargs.get("ldap_uri")
    bind_dn = kwargs.get("bind_dn")
    user_filter = kwargs.get("user_filter")
    base_dn = kwargs.get("base_dn")
    attributes_mapping = kwargs.get("attributes_mapping", {}) 

    # 2. Extract Password
    # The API returns {"secrets": {"LDAP_BIND_PASSWORD": "..."}} (Step 1173)
    # But TaskSecretMapping key (Step 1158) is "LdapSetting:LDAP_BIND_PASSWORD".
    # And Internal API (Step 1173) returns: `resolved_secrets[key_name] = val`.
    # where key_name is the part AFTER split(":", 1).
    # So key_name is "LDAP_BIND_PASSWORD".
    bind_password = secrets.get("LDAP_BIND_PASSWORD")
    
    if not bind_password:
        msg = "LDAP_BIND_PASSWORD not found in provided secrets."
        logger.error(msg)
        raise ValueError(msg)

    if not ldap_uri or not bind_dn or not base_dn:
        msg = "Missing required LDAP settings (URI, BIND_DN, or BASE_DN)."
        logger.error(msg)
        raise ValueError(msg)

    # 3. Connect to LDAP
    logger.info(f"Connecting to LDAP: {ldap_uri}")
    conn = connect_to_ldap(ldap_uri, bind_dn, bind_password)
    
    if not conn:
        raise ConnectionError("Failed to connect/bind to LDAP server.")
    
    try:
        # 4. Fetch Users
        logger.info(f"Fetching users from BaseDN: {base_dn}")
        users = fetch_users(conn, base_dn, user_filter, attributes_mapping)
        logger.info(f"Fetched {len(users)} users from LDAP.")

        if not users:
            logger.warning("No users found in LDAP. Proceeding to send empty list.")
        
        # 5. Send to Backend
        # Endpoint: /api/internal/users/sync_ldap
        url = f"{settings.BACKEND_INTERNAL_API_URL}/users/sync_ldap"
        logger.info(f"Sending batch to Backend: {url}")
        
        headers = {"X-API-Key": settings.CELERY_WORKER_API_KEY}
        
        response = httpx.post(
            url,
            json=users,
            headers=headers,
            timeout=60.0
        )
        response.raise_for_status()
        
        stats = response.json()
        logger.info(f"Sync completed successfully. Backend Stats: {stats}")
        return stats

    except Exception as e:
        logger.error(f"Error during User Sync logic: {e}", exc_info=True)
        raise e
    finally:
        if conn:
            conn.unbind()

# Register the handler
register_task_handler("users:sync_ldap", sync_ldap_users_handler)
