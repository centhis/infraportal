from typing import List
from fastapi import Depends, HTTPException, status
from app.core.security import oauth2_scheme, decode_token
from app.users.models import User
from app.auth.services import AuthService

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
    return user

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