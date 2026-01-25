
import logging
import ssl
import uuid
from typing import Optional, List, Dict, Any

from ldap3 import Server, Connection, ALL, Tls, SIMPLE, SUBTREE
from ldap3.core.exceptions import LDAPException

logger = logging.getLogger(__name__)

# --- Default Attribute Mappings ---
DEFAULT_AD_MAPPING = {
    # Core Identity
    "login": "sAMAccountName",
    "email": "mail",
    "full_name": "displayName",
    "first_name": "givenName",
    "last_name": "sn",
    "ldap_id": "objectGUID",
    "dn": "distinguishedName",
    "upn": "userPrincipalName",
    "sid": "objectSid",
    
    # Organization & Job
    "title": "title",
    "department": "department",
    "company": "company",
    "manager": "manager",
    "employee_id": "employeeID",
    "office": "physicalDeliveryOfficeName",
    
    # Contact
    "telephone": "telephoneNumber",
    "mobile": "mobile",
    "street": "streetAddress",
    "city": "l",
    "state": "st",
    "zip": "postalCode",
    "country": "co",
    
    # Account Status
    "is_active": "userAccountControl",
    "account_expires": "accountExpires",
    "pwd_last_set": "pwdLastSet",
    "created_at": "whenCreated",
    "updated_at": "whenChanged"
}

DEFAULT_OPENLDAP_MAPPING = {
    # Core Identity
    "login": "uid",
    "email": "mail",
    "full_name": "cn",
    "first_name": "givenName",
    "last_name": "sn",
    "ldap_id": "entryUUID",
    "dn": "entryDN",
    
    # Organization & Job
    "title": "title",
    "department": "ou", # Often used for dept
    "organization": "o",
    "employee_number": "employeeNumber",
    "employee_type": "employeeType",
    "description": "description",
    
    # Contact
    "telephone": "telephoneNumber",
    "mobile": "mobile",
    "street": "street",
    "city": "l",
    "state": "st",
    "zip": "postalCode",
    
    # Status (Standard OpenLDAP schemas often lack standardized 'account control', 
    # but we include common operational attributes)
    "created_at": "createTimestamp",
    "updated_at": "modifyTimestamp"
}

def normalize_object_guid(value) -> str:
    """Helper to convert binary AD GUID to string."""
    try:
        if isinstance(value, bytes):
            return str(uuid.UUID(bytes_le=value))
        if isinstance(value, str):
            # Handle cases where it might already be stringified
            return str(uuid.UUID(value.strip('{}')))
        return str(value)
    except Exception:
        return str(value)

def connect_to_ldap(
    ldap_uri: str, 
    bind_dn: str, 
    bind_password: str,
    use_tls_if_available: bool = True
) -> Optional[Connection]:
    """Establishes connection to LDAP server."""
    if not ldap_uri:
        logger.error("LDAP URI is missing.")
        return None

    use_ssl = ldap_uri.lower().startswith("ldaps://")
    
    tls_config = None
    if use_ssl or use_tls_if_available:
         tls_config = Tls(validate=ssl.CERT_NONE, version=ssl.PROTOCOL_TLSv1_2)

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

def detect_server_type(server_info) -> str:
    """Detects if server is AD or OpenLDAP."""
    if server_info and hasattr(server_info, 'other') and server_info.other:
        other_info = server_info.other
        if 'forestFunctionality' in other_info:
            return "ad"
        elif 'vendorName' in other_info and 'microsoft' in other_info['vendorName'][0].lower():
            return "ad"
    return "openldap"

def fetch_users(
    conn: Connection, 
    base_dn: str, 
    user_filter: str, 
    attributes_mapping: Optional[Dict[str, str]] = None
) -> List[Dict[str, Any]]:
    """Fetches users and maps attributes to unified keys."""
    if not base_dn:
        logger.error("LDAP Base DN is missing.")
        return []

    # 1. Determine Mapping
    if not attributes_mapping:
        server_type = detect_server_type(conn.server.info)
        logger.info(f"Auto-detected LDAP server type: {server_type}")
        if server_type == "ad":
            attributes_mapping = DEFAULT_AD_MAPPING
        else:
            attributes_mapping = DEFAULT_OPENLDAP_MAPPING
    else:
        logger.info("Using provided custom attributes mapping.")

    # 2. Determine Attributes to Fetch
    ldap_attrs = list(attributes_mapping.values())
    
    # 3. Search
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
    
    # 4. Process & Map Results
    for entry in conn.entries:
        user_data = {}
        
        for unified_key, ldap_attr in attributes_mapping.items():
            if not hasattr(entry, ldap_attr):
                continue
                
            attr_obj = getattr(entry, ldap_attr)
            if not attr_obj or not attr_obj.value:
                continue
                
            raw_val = attr_obj.value
            
            # Special Handling
            if unified_key == "ldap_id" and "GUID" in ldap_attr:
                 user_data[unified_key] = normalize_object_guid(attr_obj.raw_values[0])
            elif unified_key == "ldap_id" and "UUID" in ldap_attr:
                 user_data[unified_key] = str(raw_val)
            else:
                 user_data[unified_key] = str(raw_val)
        
        if user_data:
            results.append(user_data)
            
    return results
