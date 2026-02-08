from pydantic import BaseModel, EmailStr


class LdapUser(BaseModel):
    """
    Схема данных пользователя, полученных из LDAP.
    """

    ldap_id: str  # objectGUID или entryUUID
    ldap_dn: str
    username: str
    email: EmailStr | None = None
    full_name: str | None = None

    class Config:
        from_attributes = True
