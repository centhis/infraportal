import time
from datetime import timedelta

from fastapi.testclient import TestClient


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
    response = client.post(
        "/api/v1/auth/login", json={"login": "wronguser", "password": "wrongpassword"}
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid_credentials"


def test_refresh_token_success(client: TestClient, tmp_user):
    """
    Test successful token refresh.
    """
    login_response = client.post(
        "/api/v1/auth/login", json={"login": "testuser", "password": "password"}
    )
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


def test_refresh_token_expired(client: TestClient, user_factory, token_factory):
    """
    Test token refresh with an expired refresh token.
    """
    user = user_factory("expired_token_user", "password")

    # Create an expired refresh token
    expired_refresh_token = token_factory(
        user.id, [], token_type="refresh", expires_delta=timedelta(milliseconds=1)
    )

    # Wait for the token to expire
    time.sleep(0.01)  # Sleep for 10ms to ensure token expiration

    client.cookies.set("refresh_token", expired_refresh_token)
    refresh_response = client.get("/api/v1/auth/refresh")
    assert refresh_response.status_code == 401
    assert refresh_response.json()["detail"] == "Invalid or expired refresh token"
    assert "refresh_token" not in refresh_response.cookies  # Ensure expired token is removed


def test_refresh_token_invalid(client: TestClient):
    """
    Test token refresh with an invalid refresh token.
    """
    client.cookies.set("refresh_token", "invalid_refresh_token_string")
    response = client.get("/api/v1/auth/refresh")
    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid or expired token"
    assert "refresh_token" not in response.cookies  # Ensure invalid token is removed


def test_refresh_token_reuse(client: TestClient, user_factory):
    """
    Test refresh token reuse. After a refresh token is used once,
    the original refresh token should remain valid according to current API.
    """
    user = user_factory("reuse_token_user", "password")

    # 1. Login to get an initial refresh token
    login_response = client.post(
        "/api/v1/auth/login", json={"login": user.login, "password": "password"}
    )
    initial_refresh_token = login_response.cookies.get("refresh_token")
    assert initial_refresh_token is not None

    # 2. Use the refresh token to get a new access token
    client.cookies.set("refresh_token", initial_refresh_token)
    first_refresh_response = client.get("/api/v1/auth/refresh")
    assert first_refresh_response.status_code == 200
    first_access_token = first_refresh_response.json()["access_token"]
    assert first_access_token is not None
    # No new refresh token is expected in the response cookies
    assert first_refresh_response.cookies.get("refresh_token") is None

    # 3. Attempt to reuse the initial_refresh_token (which should still be valid)
    client.cookies.set(
        "refresh_token", initial_refresh_token
    )  # Reuse the same initial_refresh_token
    second_refresh_response = client.get("/api/v1/auth/refresh")

    assert second_refresh_response.status_code == 200  # Should still be valid
    second_access_token = second_refresh_response.json()["access_token"]
    assert second_access_token is not None
    assert (
        second_refresh_response.cookies.get("refresh_token") is None
    )  # Still no new refresh token


def test_access_token_expired(client: TestClient, user_factory, token_factory):
    """
    Test accessing a protected endpoint with an expired access token.
    """
    user = user_factory("expired_access_user", "password")

    # Create an expired access token
    expired_access_token = token_factory(
        user.id, [], token_type="access", expires_delta=timedelta(milliseconds=1)
    )

    # Wait for the token to expire
    time.sleep(0.01)  # Sleep for 10ms to ensure token expiration

    headers = {"Authorization": f"Bearer {expired_access_token}"}
    response = client.get(
        "/api/v1/auth/me", headers=headers
    )  # Assuming /me is a protected endpoint

    assert response.status_code == 401
    assert response.json()["detail"] == "User not found"


def test_verify_token_success(client: TestClient, tmp_user):
    """
    Test successful token verification.
    """
    login_response = client.post(
        "/api/v1/auth/login", json={"login": "testuser", "password": "password"}
    )
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


def test_logout_no_refresh_token(client: TestClient):
    """
    Test logout when no refresh token is present in cookies.
    Should still return 200 OK as there's no active session to log out from.
    """
    # Ensure no refresh token is set initially
    client.cookies.set("refresh_token", "")
    response = client.post("/api/v1/auth/logout")
    assert response.status_code == 200
    assert response.json()["message"] == "Logged out successfully"
    assert "refresh_token" not in response.cookies  # Should still ensure it's removed/not set


def test_logout_invalid_refresh_token(client: TestClient):
    """
    Test logout with an invalid refresh token in cookies.
    Should still return 200 OK as the invalid token won't match an active session.
    """
    client.cookies.set("refresh_token", "an_invalid_refresh_token_string")
    response = client.post("/api/v1/auth/logout")
    assert response.status_code == 200
    assert response.json()["message"] == "Logged out successfully"
    assert "refresh_token" not in response.cookies  # Should still ensure it's removed/not set


def test_get_me(client: TestClient, tmp_user):
    """
    Test retrieving the current user's information.
    """
    login_response = client.post(
        "/api/v1/auth/login", json={"login": "testuser", "password": "password"}
    )
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
    login_response = client.post(
        "/api/v1/auth/login", json={"login": "testuser", "password": "password"}
    )
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


def test_list_sessions_unauthenticated(client: TestClient):
    """
    Test that listing sessions requires authentication.
    """
    response = client.get("/api/v1/auth/sessions")
    assert response.status_code == 401
    assert response.json()["detail"] == "Not authenticated"


def test_revoke_other_user_session(test_app_client_factory, user_factory):
    """
    Test that a user cannot revoke another user's session.
    """
    # Create two users
    # admin_user created with the factory which automatically assigns admin role.
    admin_user = user_factory("admin_for_session_test", "password", roles=[{"name": "admin"}])
    regular_user = user_factory("regular_for_session_test", "password")

    # Login regular_user to create a session
    regular_user_client = test_app_client_factory()
    login_response_regular = regular_user_client.post(
        "/api/v1/auth/login", json={"login": regular_user.login, "password": "password"}
    )
    assert login_response_regular.status_code == 200
    regular_access_token = login_response_regular.json()["access_token"]
    regular_user_client.headers["Authorization"] = f"Bearer {regular_access_token}"  # Add this line
    # Get session ID for regular_user
    sessions_response_regular = regular_user_client.get("/api/v1/auth/sessions")
    assert sessions_response_regular.status_code == 200
    regular_user_session_id = sessions_response_regular.json()[0]["id"]

    # Login admin_user
    admin_user_client = test_app_client_factory()
    login_response_admin = admin_user_client.post(
        "/api/v1/auth/login", json={"login": admin_user.login, "password": "password"}
    )
    assert login_response_admin.status_code == 200
    admin_access_token = login_response_admin.json()["access_token"]
    admin_user_client.headers["Authorization"] = f"Bearer {admin_access_token}"

    # Admin user attempts to revoke regular_user's session
    revoke_response = admin_user_client.delete(f"/api/v1/auth/sessions/{regular_user_session_id}")

    # Assert that the admin cannot revoke another user's session (expected 404 Not Found)
    assert revoke_response.status_code == 404
    assert "detail" in revoke_response.json()
    assert revoke_response.json()["detail"] == "Session not found"  # Or similar message from API
