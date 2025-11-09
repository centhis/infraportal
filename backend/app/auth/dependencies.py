from fastapi import Depends, HTTPException, status

from app.users.local.models import User
from app.core.security import oauth2_scheme
from app.auth.services import AuthService

def get_current_user(
        token: str = Depends(oauth2_scheme),
        service: AuthService = Depends()
) -> User:
    payload = service.jwt_provider.decode_token(token)
    user_id = payload.get("id")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )
    user = service.db.query(User).get(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    return user