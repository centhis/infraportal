from datetime import datetime, timedelta, timezone
from jose import jwt, JWTError
from fastapi import HTTPException, status

from app.core.config import settings

class JwtProvider:
    def __init__(
            self, 
            secret_key: str = settings.SECRET_KEY,
            algorythm: str = settings.ALGORITHM
        ):
        self.secret_key = secret_key
        self.algorythm = algorythm

    def create_token(self, data: dict, expires_delta: timedelta, token_type: str):
        to_encode = data.copy()
        to_encode.update({
            "exp": datetime.now(timezone.utc) + expires_delta,
            "type": token_type
        })
        return jwt.encode(to_encode, self.secret_key, algorithm=self.algorythm)
    
    def decode_token(self, token: str):
        try:
            return jwt.decode(token, self.secret_key, algorithms=[self.algorythm])
        except JWTError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token"
            )