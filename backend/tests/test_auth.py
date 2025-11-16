from fastapi.testclient import TestClient
from app.users.local.services import UserService
from app.users.local.schemas import CreateUserSchema

def test_login_success(client: TestClient, tmp_user):
    """
    Test successful user login.
    """
    response = client.post("/api/v1/auth/login", json={"login": "testuser", "password": "password"})
    assert response.status_code == 200
    json_response = response.json()
    assert "access_token" in json_response
    assert json_response["token_type"] == "bearer"
    assert "refresh_token" in response.cookies

def test_login_invalid_credentials(client: TestClient, tmp_user):
    """
    Test login with invalid credentials.
    """
    response = client.post("/api/v1/auth/login", json={"login": "testuser", "password": "wrongpassword"})
    assert response.status_code == 401
    assert response.json() == {"detail": "Invalid_credentials"}

def test_login_validation_error(client: TestClient):
    """
    Test login with a validation error (missing password).
    """
    response = client.post("/api/v1/auth/login", json={"login": "testuser"})
    assert response.status_code == 422

def test_refresh_token_success(client: TestClient, tmp_user):
    """
    Test successful token refresh.
    """
    login_response = client.post("/api/v1/auth/login", json={"login": "testuser", "password": "password"})
    refresh_token = login_response.cookies.get("refresh_token")
    
    client.cookies.set("refresh_token", refresh_token)
    refresh_response = client.get("/api/v1/auth/refresh")
    assert refresh_response.status_code == 200
    json_response = refresh_response.json()
    assert "access_token" in json_response
    assert json_response["token_type"] == "bearer"

def test_refresh_token_no_token(client: TestClient):
    """
    Test token refresh without a token.
    """
    response = client.get("/api/v1/auth/refresh")
    assert response.status_code == 401
    assert response.json() == {"detail": "Could not load refresh token"}

def test_verify_token_success(client: TestClient, tmp_user):
    """
    Test successful token verification.
    """
    login_response = client.post("/api/v1/auth/login", json={"login": "testuser", "password": "password"})
    access_token = login_response.json()["access_token"]
    
    headers = {"Authorization": f"Bearer {access_token}"}
    verify_response = client.get("/api/v1/auth/verify", headers=headers)
    assert verify_response.status_code == 200
    assert verify_response.json() == {"message": "Access token is valid"}

def test_verify_token_invalid(client: TestClient):
    """
    Test token verification with an invalid token.
    """
    headers = {"Authorization": "Bearer invalidtoken"}
    response = client.get("/api/v1/auth/verify", headers=headers)
    assert response.status_code == 401

def test_logout(client: TestClient, tmp_user):
    """
    Test user logout.
    """
    login_response = client.post("/api/v1/auth/login", json={"login": "testuser", "password": "password"})
    refresh_token = login_response.cookies.get("refresh_token")
    client.cookies.set("refresh_token", refresh_token)

    response = client.post("/api/v1/auth/logout")
    assert response.status_code == 200
    assert response.json() == {"message": "Logged out successfully"}
    
    # Verify the Set-Cookie header indicates deletion
    set_cookie_header = response.headers.get("set-cookie")
    assert "refresh_token=;" in set_cookie_header or 'refresh_token="";' in set_cookie_header
    assert "Max-Age=0" in set_cookie_header or "expires=Thu, 01 Jan 1970" in set_cookie_header

def test_get_me_success(client: TestClient, tmp_user):
    """
    Test getting the current user's information.
    """
    login_response = client.post("/api/v1/auth/login", json={"login": "testuser", "password": "password"})
    access_token = login_response.json()["access_token"]
    
    headers = {"Authorization": f"Bearer {access_token}"}
    me_response = client.get("/api/v1/auth/me", headers=headers)
    
    assert me_response.status_code == 200
    user_data = me_response.json()
    assert user_data["login"] == "testuser"
    assert user_data["name"] == "Test User"
