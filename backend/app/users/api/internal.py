
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, Body
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.auth.dependencies import get_worker_api_key
from app.users.ldap.services import sync_ldap_users_batch

router = APIRouter(tags=["Internal"])

@router.post("/users/sync_ldap", dependencies=[Depends(get_worker_api_key)])
def sync_ldap_users_internal(
    users: List[Dict[str, Any]] = Body(...),
    db: Session = Depends(get_db)
):
    """
    Internal endpoint to sync a batch of users from external source (LDAP Worker).
    Accepts dynamic list of user dictionaries.
    """
    stats = sync_ldap_users_batch(db, users)
    return stats
