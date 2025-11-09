from fastapi import HTTPException, status, Depends

from app.db.database import db_dependency
from app.users.local.models import User
from app.core.security import ACCESS_TOKEN_EXPIRE, REFRESH_TOKEN_EXPIRE, verify_password
from app.core.jwt_prvider import JwtProvider


class AuthService:
    def __init__(self, db: db_dependency, jwt_provider: JwtProvider = Depends()):
        self.db = db
        self.jwt_provider = jwt_provider

    def authenticate_user(self, login: str, password: str):
        user = self.db.query(User).filter(User.login == login.lower()).first()
        if not user or not verify_password(password, user.password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid_credentials"
            )
        return user
    
    def create_tokens(self, user: User):
        access = self.jwt_provider.create_token({"sub": user.login, "id": user.id}, ACCESS_TOKEN_EXPIRE, "access")
        refresh = self.jwt_provider.create_token({"sub": user.login, "id": user.id}, REFRESH_TOKEN_EXPIRE, "refresh")
        return access, refresh
    
    def referesh_access_token(self, refresh_token: str):
        payload = self.jwt_provider.decode_token(refresh_token)
        if payload.get("type") != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type"
            )
        user = self.db.query(User).filter(User.id == payload.get("id")).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found"
            )
        new_access = self.jwt_provider.create_token({"sub": user.login, "id": user.id}, ACCESS_TOKEN_EXPIRE, "access")
        return new_access