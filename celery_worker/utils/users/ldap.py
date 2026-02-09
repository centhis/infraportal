
import logging
import ssl
import uuid
from typing import Optional, List, Dict, Any

from ldap3 import Server, Connection, ALL, Tls, SIMPLE, SUBTREE
from ldap3.core.exceptions import LDAPException

logger = logging.getLogger(__name__)

# OID для Active Directory Root DSE
AD_OID = "1.2.840.113556.1.4.800"


# --- Стандартные маппинги атрибутов ---
DEFAULT_AD_MAPPING = {
    # Основные данные (Core Identity)
    "login": "sAMAccountName",
    "email": "mail",
    "full_name": "displayName",
    "first_name": "givenName",
    "last_name": "sn",
    "ldap_id": "objectGUID",
    "dn": "distinguishedName",
    "upn": "userPrincipalName",
    "sid": "objectSid",
    
    # Организация и должность (Organization & Job)
    "title": "title",
    "department": "department",
    "company": "company",
    "manager": "manager",
    "employee_id": "employeeID",
    "office": "physicalDeliveryOfficeName",
    
    # Контакты (Contact)
    "telephone": "telephoneNumber",
    "mobile": "mobile",
    "street": "streetAddress",
    "city": "l",
    "state": "st",
    "zip": "postalCode",
    "country": "co",
    
    # Статус аккаунта (Account Status)
    "is_active": "userAccountControl",
    "account_expires": "accountExpires",
    "pwd_last_set": "pwdLastSet",
    "created_at": "whenCreated",
    "updated_at": "whenChanged"
}

DEFAULT_OPENLDAP_MAPPING = {
    # Основные данные (Core Identity)
    "login": "uid",
    "email": "mail",
    "full_name": "cn",
    "first_name": "givenName",
    "last_name": "sn",
    "ldap_id": "entryUUID",
    "dn": "entryDN",
    
    # Организация и должность (Organization & Job)
    "title": "title",
    "department": "ou", # Часто используется для отдела
    "organization": "o",
    "employee_number": "employeeNumber",
    "employee_type": "employeeType",
    "description": "description",
    
    # Контакты (Contact)
    "telephone": "telephoneNumber",
    "mobile": "mobile",
    "street": "street",
    "city": "l",
    "state": "st",
    "zip": "postalCode",
    
    # Статус (Стандартные схемы OpenLDAP часто не имеют единого поля статуса, 
    # но мы включаем общие операционные атрибуты)
    "created_at": "createTimestamp",
    "updated_at": "modifyTimestamp"
}

def normalize_object_guid(value) -> str:
    """Вспомогательная функция для конвертации бинарного AD GUID в строку."""
    try:
        if isinstance(value, bytes):
            return str(uuid.UUID(bytes_le=value))
        if isinstance(value, str):
            # Обработка случаев, когда значение уже приведено к строке
            return str(uuid.UUID(value.strip('{}')))
        return str(value)
    except Exception:
        return str(value)
    except Exception:
        return str(value)

def connect_to_ldap(
    ldap_uri: str, 
    bind_dn: str, 
    bind_password: str,
    use_tls_if_available: bool = True,
    tls_verify: bool = True
) -> Optional[Connection]:
    """Устанавливает соединение с LDAP сервером."""
    if not ldap_uri:
        logger.error("LDAP URI is missing.")
        return None

    use_ssl = ldap_uri.lower().startswith("ldaps://")
    
    tls_config = None
    if use_ssl or use_tls_if_available:
        # Соответствие логике бэкенда: PROTOCOL_TLS и настройка проверки
        validate = ssl.CERT_REQUIRED if tls_verify else ssl.CERT_NONE
        tls_config = Tls(validate=validate, version=ssl.PROTOCOL_TLS)

    try:
        server = Server(ldap_uri, use_ssl=use_ssl, tls=tls_config, get_info=ALL)
        conn = Connection(
            server, 
            user=bind_dn, 
            password=bind_password, 
            authentication=SIMPLE,
            auto_bind=True,
            receive_timeout=10
        )
        return conn
    except Exception as e:
        logger.error(f"Failed to connect to LDAP: {e}")
        return None

def detect_server_type(server: Server, connection: Connection | None = None) -> str:
    """
    Определяет тип сервера (Active Directory или OpenLDAP).
    Выполняет оптимизированный запрос Root DSE для получения необходимых атрибутов.
    """
    # 1. Если есть соединение, делаем точный запрос Root DSE
    if connection and connection.bound:
        try:
            if connection.search(
                search_base="",
                search_filter="(objectClass=*)",
                search_scope="BASE",
                attributes=["*", "+"],  # Все атрибуты + операционные
            ):
                if connection.entries:
                    dse = connection.entries[0]

                    # Проверка по OID
                    if "supportedCapabilities" in dse and AD_OID in dse["supportedCapabilities"].values:
                        logger.info(f"LDAP Server detected as: Active Directory (via OID {AD_OID})")
                        return "ad"

                    # Проверка по forestFunctionality
                    if "forestFunctionality" in dse:
                        logger.info("LDAP Server detected as: Active Directory (via forestFunctionality)")
                        return "ad"

                    # Проверка по vendorName
                    if "vendorName" in dse:
                        vendor = str(dse["vendorName"].value).lower()
                        if "microsoft" in vendor:
                            logger.info(f"LDAP Server detected as: Active Directory (via vendorName '{vendor}')")
                            return "ad"
        except Exception as e:
            logger.warning(f"Error during manual server detection: {e}")

    # 2. Fallback на server.info
    if server.info:
        logger.info("Falling back to server.info for detection")
        if (
            hasattr(server.info, "supportedCapabilities")
            and AD_OID in server.info.supportedCapabilities
        ):
            return "ad"

        if hasattr(server.info, "other") and server.info.other:
            other = server.info.other
            if "forestFunctionality" in other:
                return "ad"
            if "vendorName" in other and "microsoft" in other["vendorName"][0].lower():
                return "ad"

    logger.info("LDAP Server detected as: OpenLDAP (default)")
    return "openldap"

def fetch_users(
    conn: Connection, 
    base_dn: str, 
    user_filter: str, 
    attributes_mapping: Optional[Dict[str, str]] = None
) -> List[Dict[str, Any]]:
    """Получает пользователей и маппит атрибуты в унифицированные ключи."""
    if not base_dn:
        logger.error("LDAP Base DN is missing.")
        return []

    # 1. Определяем маппинг
    if not attributes_mapping:
        server_type = detect_server_type(conn.server, conn)
        logger.info(f"Auto-detected LDAP server type: {server_type}")
        if server_type == "ad":
            attributes_mapping = DEFAULT_AD_MAPPING
        else:
            attributes_mapping = DEFAULT_OPENLDAP_MAPPING
    else:
        logger.info("Using provided custom attributes mapping.")

    # 2. Список атрибутов для получения
    ldap_attrs = list(attributes_mapping.values())
    
    # 3. Поиск
    try:
        conn.search(
            search_base=base_dn,
            search_filter=user_filter or "(objectClass=*)",
            search_scope=SUBTREE,
            attributes=ldap_attrs
        )
    except LDAPException as e:
        logger.error(f"LDAP Search failed: {e}")
        return []

    results = []
    
    # 4. Обработка и маппинг результатов
    for entry in conn.entries:
        user_data = {}
        
        for unified_key, ldap_attr in attributes_mapping.items():
            if not hasattr(entry, ldap_attr):
                continue
                
            attr_obj = getattr(entry, ldap_attr)
            if not attr_obj or not attr_obj.value:
                continue
                
            raw_val = attr_obj.value
            
            # Специальная обработка
            if unified_key == "ldap_id" and "GUID" in ldap_attr:
                 user_data[unified_key] = normalize_object_guid(attr_obj.raw_values[0])
            elif unified_key == "ldap_id" and "UUID" in ldap_attr:
                 user_data[unified_key] = str(raw_val)
            else:
                 user_data[unified_key] = str(raw_val)
        
        if user_data:
            results.append(user_data)
            
    return results
