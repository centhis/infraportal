import pytest
from fastapi.testclient import TestClient
from datetime import datetime, timedelta, timezone

from app.core.config import settings
from app.core.security import create_token, REFRESH_TOKEN_EXPIRE

def test_login_success(client: TestClient, tmp_user):
    """
    Test successful user login.
    """
    response = client.post("/api/v1/auth/login", json={"login": "testuser", "password": "password"})
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "token_type" in data
    assert "permissions" in data
    assert response.cookies.get("refresh_token") is not None

def test_login_invalid_credentials(client: TestClient):
    """
    Test login with invalid credentials.
    """
    response = client.post("/api/v1/auth/login", json={"login": "wronguser", "password": "wrongpassword"})
    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid_credentials"

def test_refresh_token_success(client: TestClient, tmp_user):
    """
    Test successful token refresh.
    """
    login_response = client.post("/api/v1/auth/login", json={"login": "testuser", "password": "password"})
    refresh_token = login_response.cookies.get("refresh_token")
    
    client.cookies.set("refresh_token", refresh_token)
    refresh_response = client.get("/api/v1/auth/refresh")
    assert refresh_response.status_code == 200
    data = refresh_response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"

def test_refresh_token_no_cookie(client: TestClient):
    """
    Test token refresh without a refresh token cookie.
    """
    response = client.get("/api/v1/auth/refresh")
    assert response.status_code == 401
    assert response.json()["detail"] == "Could not load refresh token"

def test_verify_token_success(client: TestClient, tmp_user):
    """
    Test successful token verification.
    """
    login_response = client.post("/api/v1/auth/login", json={"login": "testuser", "password": "password"})
    access_token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {access_token}"}
    verify_response = client.get("/api/v1/auth/verify", headers=headers)
    assert verify_response.status_code == 200
    assert verify_response.json()["message"] == "Access token is valid"

def test_verify_token_invalid(client: TestClient):
    """
    Test token verification with an invalid token.
    """
    headers = {"Authorization": "Bearer invalidtoken"}
    response = client.get("/api/v1/auth/verify", headers=headers)
    assert response.status_code == 401

def test_logout(client: TestClient):
    """
    Test user logout.
    """
    client.post("/api/v1/auth/login", json={"login": "testuser", "password": "password"})
    response = client.post("/api/v1/auth/logout")
    assert response.status_code == 200
    assert response.json()["message"] == "Logged out successfully"
    assert "refresh_token" not in response.cookies

def test_get_me(client: TestClient, tmp_user):
    """
    Test retrieving the current user's information.
    """
    login_response = client.post("/api/v1/auth/login", json={"login": "testuser", "password": "password"})
    access_token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {access_token}"}
    response = client.get("/api/v1/auth/me", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["login"] == "testuser"
    assert data["name"] == "Test User"

def test_list_sessions(client: TestClient, tmp_user):
    """
    Test listing active sessions for a user.
    """
    login_response = client.post("/api/v1/auth/login", json={"login": "testuser", "password": "password"})
    access_token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {access_token}"}
    
    response = client.get("/api/v1/auth/sessions", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0
    assert "id" in data[0]
    assert "user_agent" in data[0]
    assert "ip_address" in data[0]

def test_revoke_session(client: TestClient, tmp_user):
    """
    Test revoking a specific session.
    """
    login_response = client.post("/api/v1/auth/login", json={"login": "testuser", "password": "password"})
    access_token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {access_token}"}

    sessions_before = client.get("/api/v1/auth/sessions", headers=headers).json()
    session_to_revoke = sessions_before[0]

    revoke_response = client.delete(f"/api/v1/auth/sessions/{session_to_revoke['id']}", headers=headers)
    assert revoke_response.status_code == 200
    assert revoke_response.json()["message"] == "Session revoked successfully"

    sessions_after = client.get("/api/v1/auth/sessions", headers=headers).json()
    assert len(sessions_after) == len(sessions_before) - 1
    assert session_to_revoke["id"] not in [s["id"] for s in sessions_after]
