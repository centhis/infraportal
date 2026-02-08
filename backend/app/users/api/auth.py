from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status

from app.auth.dependencies import get_current_user
from app.auth.schemas import CurrenUserSchema, LoginUserSchema, SessionResponseSchema, Token
from app.auth.services import AuthService
from app.core.security import REFRESH_TOKEN_EXPIRE, decode_token, oauth2_scheme
from app.users.models import User
from app.users.permissions.services import PermissionService

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=Token)
def login(
    payload: LoginUserSchema,
    response: Response,
    request: Request,
    service: AuthService = Depends(),
    permission_service: PermissionService = Depends(),
):
    user = service.authenticate_user(payload.login, payload.password)
    access_token, refresh_token = service.create_tokens(user, request)
    permissions = permission_service.get_user_permissions(user.id)
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        max_age=int(REFRESH_TOKEN_EXPIRE.total_seconds()),
        expires=datetime.now(UTC) + REFRESH_TOKEN_EXPIRE,
        path="/",
        domain=None,
        httponly=True,
        secure=False,
        samesite="lax",
    )
    return {"access_token": access_token, "token_type": "bearer", "permissions": permissions}


@router.get("/refresh")
def refresh_token(request: Request, service: AuthService = Depends()):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not load refresh token"
        )
    access = service.referesh_access_token(token)
    return {"access_token": access, "token_type": "bearer"}


@router.get("/verify")
def verify_token(token: str = Depends(oauth2_scheme)):
    payload = decode_token(token)
    if payload.get("type") != "access":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type")
    return {"message": "Access token is valid"}


@router.post("/logout")
def logout(request: Request, response: Response, service: AuthService = Depends()):
    refresh_token = request.cookies.get("refresh_token")
    if refresh_token:
        service.logout(refresh_token)
    response.delete_cookie("refresh_token")
    return {"message": "Logged out successfully"}


@router.get("/me", response_model=CurrenUserSchema)
def get_me(
    current_user: User = Depends(get_current_user),
    permission_service: PermissionService = Depends(),
):
    user_permissions = permission_service.get_user_permissions(current_user.id)
    user_dict = current_user.__dict__
    user_dict["permissions"] = user_permissions
    return CurrenUserSchema.model_validate(user_dict)


@router.get("/sessions", response_model=list[SessionResponseSchema])
def list_sessions(current_user: User = Depends(get_current_user), service: AuthService = Depends()):
    return service.list_sessions(current_user.id)


@router.delete("/sessions/{session_id}")
def revoke_session(
    session_id: int,
    current_user: User = Depends(get_current_user),
    service: AuthService = Depends(),
):
    service.revoke_session(current_user.id, session_id)
    return {"message": "Session revoked successfully"}
