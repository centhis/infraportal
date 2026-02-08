from typing import Any

from fastapi import APIRouter, Body, Depends
from sqlalchemy.orm import Session

from app.auth.dependencies import get_worker_api_key
from app.db.database import get_db
from app.users.ldap.services import sync_ldap_users_batch

router = APIRouter(tags=["Internal"])


@router.post("/users/sync_ldap", dependencies=[Depends(get_worker_api_key)])
def sync_ldap_users_internal(
    users: list[dict[str, Any]] = Body(...), db: Session = Depends(get_db)
):
    """
    Внутренний эндпоинт для синхронизации пакета пользователей из внешнего источника (LDAP Worker).
    Принимает динамический список словарей пользователей.
    """
    stats = sync_ldap_users_batch(db, users)
    return stats
