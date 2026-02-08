from fastapi import Depends, HTTPException, Security, status
from fastapi.security import APIKeyHeader

from app.auth.services import AuthService
from app.core.config import settings
from app.core.security import decode_token, oauth2_scheme
from app.users.models import User

# Type alias для использования в других модулях через auth
# Это позволяет избежать прямого импорта из users в settings/tasks
CurrentUser = User

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
    token: str = Depends(oauth2_scheme), auth_service: AuthService = Depends()
) -> User:
    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type")
    user = auth_service.db.query(User).filter(User.id == payload.get("id")).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User is inactive")
    return user


def get_current_user_permissions(token: str = Depends(oauth2_scheme)) -> list[str]:
    """
    Извлекает права пользователя напрямую из payload токена.
    Не делает запросов к БД для производительности.
    """
    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type")
    return payload.get("permissions", [])


def permission_checker(required_permissions: list[str]):
    def _permission_checker(token: str = Depends(oauth2_scheme)):
        payload = decode_token(token)
        user_permissions = payload.get("permissions", [])
        for permission in required_permissions:
            if permission not in user_permissions:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You do not have permission to perform this action",
                )

    return _permission_checker
