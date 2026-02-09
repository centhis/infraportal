from sqlalchemy.orm import Session

from app.core.task_contract import TaskDefinition
from app.users.ldap import services as LdapService


def result_handler(result: dict, db: Session) -> dict:
    """Обрабатывает результат синхронизации LDAP."""
    users_data = result.get("users", [])
    if not users_data:
        # Если пришел пустой список, это либо ошибка в воркере, либо пустой LDAP.
        # В сервисе уже есть защита, но здесь мы можем добавить специфичное сообщение.
        return {"error": "LDAP returned no users. Aborting sync."}

    # Вызываем консолидированную логику в сервисе
    return LdapService.sync_ldap_users_batch(db, users_data)


TASK = TaskDefinition(
    name="users:sync_ldap",
    display_name="Синхронизация LDAP",
    category="users",
    permission="users:update",
    secrets=[
        "LDAP_URI",
        "LDAP_BIND_DN",
        "LDAP_BIND_PASSWORD",
        "LDAP_BASE_DN",
        "LDAP_USER_FILTER",
        "LDAP_TLS_VERIFY",
    ],
    result_handler=result_handler,
    params_schema=None,
)
