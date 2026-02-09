from datetime import UTC, datetime

from fastapi import Depends, HTTPException, Request, status

from app.auth.models import UserSession
from app.core.security import (
    ACCESS_TOKEN_EXPIRE,
    REFRESH_TOKEN_EXPIRE,
    create_token,
    decode_token,
    verify_password,
)
from app.db.database import db_dependency
from app.settings.ldap.services import is_ldap_enabled
from app.users.ldap.services import authenticate_ldap_user, get_ldap_user_info
from app.users.models import User
from app.users.permissions.services import PermissionService


class AuthService:
    def __init__(self, db: db_dependency, permission_service: PermissionService = Depends()):
        self.db = db
        self.permission_service = permission_service

    def authenticate_user(self, login: str, password: str):
        # 1. Сначала ищем пользователя в локальной базе данных
        login_lower = login.lower()
        user = self.db.query(User).filter(User.login == login_lower).first()

        # 2. Если пользователь локальный или встроенный -> обычная проверка пароля
        if user and user.type in ["built_in", "local"]:
            if not verify_password(password, user.password):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid_credentials"
                )
            if not user.is_active:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED, detail="User is inactive"
                )
            return user

        # 3. LDAP интеграция (если пользователь помечен как ldap или не найден вовсе)
        is_ldap = is_ldap_enabled(self.db)

        # Если пользователь существует и помечен как LDAP, но интеграция выключена -> ошибка
        if user and user.type == "ldap" and not is_ldap:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Ldap_integration_disabled"
            )

        if is_ldap:
            # Пытаемся аутентифицировать через LDAP
            # Используем ldap_id для поиска, если пользователь уже есть в базе (защита от переименования)
            ldap_id = user.ldap_id if user else None

            ldap_result = authenticate_ldap_user(self.db, login_lower, password, ldap_id=ldap_id)
            if ldap_result:
                ldap_entry, server_type = ldap_result
                user_info = get_ldap_user_info(ldap_entry, server_type)

                if user_info:
                    # 2.4.2 / 2.4.3 Использование общей логики для создания/обновления
                    # Импортируем локально, чтобы избежать потенциального цикла, если auth импортируется пользователями
                    from app.users.ldap.services import create_or_update_ldap_user

                    user = create_or_update_ldap_user(self.db, user_info)

                    # Убедиться, что изменения зафиксированы
                    self.db.commit()
                    self.db.refresh(user)

                    if not user.is_active:
                        raise HTTPException(
                            status_code=status.HTTP_401_UNAUTHORIZED, detail="User is inactive"
                        )

                    return user

        # 4. Если ничего не помогло -> ошибка входа
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid_credentials")

    def create_tokens(self, user: User, request: Request):
        permissions = self.permission_service.get_user_permissions(user.id)
        access_payload = {"sub": user.login, "id": user.id, "permissions": permissions}
        access = create_token(access_payload, ACCESS_TOKEN_EXPIRE, "access")
        refresh = create_token({"sub": user.login, "id": user.id}, REFRESH_TOKEN_EXPIRE, "refresh")

        session = UserSession(
            user_id=user.id,
            refresh_token=refresh,
            expires_at=datetime.now(UTC) + REFRESH_TOKEN_EXPIRE,
            user_agent=request.headers.get("user-agent"),
            ip_address=request.client.host,
        )
        self.db.add(session)
        self.db.commit()

        return access, refresh

    def referesh_access_token(self, refresh_token: str):  # Оригинальная сигнатура без 'request'
        payload = decode_token(refresh_token)
        if payload.get("type") != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type"
            )

        session = (
            self.db.query(UserSession).filter(UserSession.refresh_token == refresh_token).first()
        )
        if not session or session.expires_at < datetime.now(UTC):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired refresh token"
            )

        user = self.db.query(User).filter(User.id == payload.get("id")).first()
        if not user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
        permissions = self.permission_service.get_user_permissions(user.id)
        new_access_payload = {"sub": user.login, "id": user.id, "permissions": permissions}
        new_access = create_token(new_access_payload, ACCESS_TOKEN_EXPIRE, "access")
        return new_access

    def logout(self, refresh_token: str):
        session = (
            self.db.query(UserSession).filter(UserSession.refresh_token == refresh_token).first()
        )
        if session:
            self.db.delete(session)
            self.db.commit()

    def list_sessions(self, user_id: int):
        return self.db.query(UserSession).filter(UserSession.user_id == user_id).all()

    def revoke_session(self, user_id: int, session_id: int):
        session = (
            self.db.query(UserSession)
            .filter(UserSession.id == session_id, UserSession.user_id == user_id)
            .first()
        )
        if session:
            self.db.delete(session)
            self.db.commit()
        else:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
