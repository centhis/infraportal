from passlib.context import CryptContext
from fastapi.security import OAuth2PasswordBearer
from datetime import timedelta
from app.core.jwt_prvider import JwtProvider

from app.core.config import settings

pwd_context = CryptContext(schemes=['argon2'], deprecated='auto')
oauth2_scheme = OAuth2PasswordBearer(tokenUrl=settings.API_PREFIX + "/auth/login")

ACCESS_TOKEN_EXPIRE = timedelta(minutes=15)
REFRESH_TOKEN_EXPIRE = timedelta(days=30)

jwt_provider = JwtProvider()

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

def create_token(data: dict, expires_delta: timedelta, token_type: str):
    return jwt_provider.create_token(data, expires_delta, token_type)

def decode_token(token: str):
    return jwt_provider.decode_token(token)