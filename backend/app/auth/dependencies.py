from typing import List
from fastapi import Depends, HTTPException, status, Security
from fastapi.security import APIKeyHeader
from app.core.config import settings
from app.core.security import oauth2_scheme, decode_token
from app.users.models import User
from app.auth.services import AuthService

API_KEY_HEADER = APIKeyHeader(name="X-API-Key", auto_error=False)

def get_worker_api_key(
    api_key_header: str = Security(API_KEY_HEADER),
):
    """
    Зависимость для проверки API-ключа от worker-а в заголовке X-API-Key.
    """
    if not api_key_header or api_key_header != settings.CELERY_WORKER_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing API Key",
        )
    return True

def get_current_user(
    token: str = Depends(oauth2_scheme), 
    auth_service: AuthService = Depends()
) -> User:
    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type"
        )
    user = auth_service.db.query(User).filter(User.id == payload.get("id")).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User is inactive"
        )
    return user


def get_current_user_permissions(token: str = Depends(oauth2_scheme)) -> List[str]:
    """
    Extracts user permissions directly from the token payload.
    Does not hit the database for performance.
    """
    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type"
        )
    return payload.get("permissions", [])

def permission_checker(required_permissions: List[str]):
    def _permission_checker(token: str = Depends(oauth2_scheme)):
        payload = decode_token(token)
        user_permissions = payload.get("permissions", [])
        for permission in required_permissions:
            if permission not in user_permissions:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You do not have permission to perform this action"
                )
    return _permission_checker
