from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from datetime import datetime, timezone

from app.auth.schemas import LoginUserSchema, CurrenUserSchema
from app.auth.services import AuthService
from app.auth.dependencies import get_current_user
from app.core.security import REFRESH_TOKEN_EXPIRE, oauth2_scheme
from app.users.models import User

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post('/login')
def login(payload: LoginUserSchema, response: Response, service: AuthService = Depends()):
    user = service.authenticate_user(payload.login, payload.password)
    access_token, refresh_token = service.create_tokens(user)
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        max_age=int(REFRESH_TOKEN_EXPIRE.total_seconds()),
        expires=datetime.now(timezone.utc) + REFRESH_TOKEN_EXPIRE,
        path="/",
        domain=None,
        httponly=True,
        secure=False,
        samesite="lax"
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/refresh")
def refresh_token(request: Request, service: AuthService = Depends()):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not load refresh token"
        )
    access = service.referesh_access_token(token)
    return {"access_token": access, "token_type": "bearer"}

@router.get("/verify")
def verify_token(token: str = Depends(oauth2_scheme), service: AuthService = Depends()):
    payload = service.jwt_provider.decode_token(token)
    if payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type"
        )
    return {"message": "Access token is valid"}

@router.post("/logout")
def logout(response: Response):
    response.delete_cookie("refresh_token")
    return {"message": "Logged out successfully"}

@router.get("/me", response_model=CurrenUserSchema)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user