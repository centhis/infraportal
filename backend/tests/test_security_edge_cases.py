from unittest.mock import MagicMock

import pytest

from app.auth.services import AuthService
from app.users.models import User


def test_deactivated_user_cannot_login(db_session):
    # Setup: Create a deactivated user
    service = AuthService(db_session, permission_service=MagicMock())
    user = User(login="inactive", name="Inactive User", type="local", is_active=False)
    from app.core.security import hash_password

    user.password = hash_password("password123")
    db_session.add(user)
    db_session.commit()

    # Try to authenticate
    with pytest.raises(Exception) as exc:
        service.authenticate_user("inactive", "password123")
    assert "User is inactive" in str(exc.value)


def test_deactivated_user_token_rejected(db_session, authenticated_client):
    # Setup: Get a valid token for a user, then deactivate them
    # Fetch admin user by login from settings
    from app.core.config import settings

    user = db_session.query(User).filter(User.login == settings.DEFAULT_ADMIN_USER).first()
    assert user is not None
    user.is_active = False
    db_session.commit()

    # Try to access a protected endpoint
    response = authenticated_client.get("/api/v1/users/me")
    assert response.status_code == 401
    assert response.json()["detail"] == "User is inactive"
