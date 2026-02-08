from pydantic import BaseModel


class SyncLdapParams(BaseModel):
    """Параметры запуска синхронизации LDAP.
    Все настройки воркер получает через internal API (/api/internal/secrets).
    """
    pass


# (name, schema, permission, context_loader)
# context_loader=None — воркер получает настройки через secrets API
TASK_DEFINITIONS = [("users:sync_ldap", SyncLdapParams, "users:update", None)]
