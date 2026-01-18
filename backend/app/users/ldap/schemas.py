from typing import Optional
from pydantic import BaseModel, EmailStr

class LdapUser(BaseModel):
    """
    Схема данных пользователя, полученных из LDAP.
    """
    ldap_id: str  # objectGUID или entryUUID
    ldap_dn: str
    username: str
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    
    class Config:
        from_attributes = True
