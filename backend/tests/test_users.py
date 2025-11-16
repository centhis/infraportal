from fastapi.testclient import TestClient
from app.users.local.schemas import CreateUserSchema, UpdateUserSchema
from app.users.local.services import UserService

def test_list_users_unauthenticated(client: TestClient):
    """
    Test that listing users requires authentication.
    """
    response = client.get("/api/v1/users/")
    assert response.status_code == 401

def test_list_users_success(client: TestClient, tmp_user):
    """
    Test successfully listing users.
    """
    login_response = client.post("/api/v1/auth/login", json={"login": "testuser", "password": "password"})
    access_token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {access_token}"}

    response = client.get("/api/v1/users/", headers=headers)
    assert response.status_code == 200
    json_response = response.json()
    assert "users" in json_response
    assert "total" in json_response
    assert isinstance(json_response["users"], list)
    assert len(json_response["users"]) > 0

def test_get_user_by_id_success(client: TestClient, tmp_user):
    """
    Test getting a user by ID successfully.
    """
    login_response = client.post("/api/v1/auth/login", json={"login": "testuser", "password": "password"})
    access_token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {access_token}"}

    response = client.get(f"/api/v1/users/{tmp_user.id}", headers=headers)
    assert response.status_code == 200
    user_data = response.json()
    assert user_data["id"] == tmp_user.id
    assert user_data["login"] == tmp_user.login

def test_get_user_by_id_not_found(client: TestClient, tmp_user):
    """
    Test getting a non-existent user by ID.
    """
    login_response = client.post("/api/v1/auth/login", json={"login": "testuser", "password": "password"})
    access_token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {access_token}"}

    response = client.get("/api/v1/users/99999", headers=headers) # Assuming 99999 is a non-existent ID
    assert response.status_code == 404

def test_get_user_by_login_success(client: TestClient, tmp_user):
    """
    Test getting a user by login successfully.
    """
    login_response = client.post("/api/v1/auth/login", json={"login": "testuser", "password": "password"})
    access_token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {access_token}"}

    response = client.get(f"/api/v1/users/by-login/{tmp_user.login}", headers=headers)
    assert response.status_code == 200
    user_data = response.json()
    assert user_data["id"] == tmp_user.id
    assert user_data["login"] == tmp_user.login

def test_get_user_by_login_not_found(client: TestClient, tmp_user):
    """
    Test getting a non-existent user by login.
    """
    login_response = client.post("/api/v1/auth/login", json={"login": "testuser", "password": "password"})
    access_token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {access_token}"}

    response = client.get("/api/v1/users/by-login/nonexistent", headers=headers)
    assert response.status_code == 404

def test_create_user_success(client: TestClient, tmp_user, db_session):
    """
    Test creating a new user successfully.
    """
    login_response = client.post("/api/v1/auth/login", json={"login": "testuser", "password": "password"})
    access_token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {access_token}"}

    new_user_data = {
        "login": "newuser",
        "password": "newpassword",
        "name": "New User",
        "is_admin": False,
        "is_active": True,
        "is_ldap": False
    }
    response = client.post("/api/v1/users/", json=new_user_data, headers=headers)
    assert response.status_code == 200
    user_data = response.json()
    assert user_data["login"] == "newuser"
    assert user_data["name"] == "New User"

def test_create_user_duplicate_login(client: TestClient, tmp_user):
    """
    Test creating a user with a duplicate login.
    """
    login_response = client.post("/api/v1/auth/login", json={"login": "testuser", "password": "password"})
    access_token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {access_token}"}

    duplicate_user_data = {
        "login": "testuser", # Duplicate login
        "password": "somepassword",
        "name": "Another User",
        "is_admin": False,
        "is_active": True,
        "is_ldap": False
    }
    response = client.post("/api/v1/users/", json=duplicate_user_data, headers=headers)
    assert response.status_code == 400 # Assuming 400 Bad Request for duplicate login

def test_update_user_success(client: TestClient, tmp_user, db_session):
    """
    Test updating an existing user successfully.
    """
    login_response = client.post("/api/v1/auth/login", json={"login": "testuser", "password": "password"})
    access_token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {access_token}"}

    user_to_update_schema = CreateUserSchema(login="tobeupdated", password="password", name="To Be Updated")
    user_service = UserService(db_session)
    user_to_update = user_service.create_user(user_to_update_schema)

    updated_data = {
        "name": "Updated Name",
        "is_active": False
    }
    response = client.put(f"/api/v1/users/{user_to_update.id}", json=updated_data, headers=headers)
    assert response.status_code == 200
    user_data = response.json()
    assert user_data["name"] == "Updated Name"
    assert user_data["is_active"] == False

def test_update_user_not_found(client: TestClient, tmp_user):
    """
    Test updating a non-existent user.
    """
    login_response = client.post("/api/v1/auth/login", json={"login": "testuser", "password": "password"})
    access_token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {access_token}"}

    updated_data = {
        "name": "Non Existent"
    }
    response = client.put("/api/v1/users/99999", json=updated_data, headers=headers)
    assert response.status_code == 404

def test_delete_user_success(client: TestClient, tmp_user, db_session):
    """
    Test deleting an existing user successfully.
    """
    login_response = client.post("/api/v1/auth/login", json={"login": "testuser", "password": "password"})
    access_token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {access_token}"}

    user_to_delete_schema = CreateUserSchema(login="tobedeleted", password="password", name="To Be Deleted")
    user_service = UserService(db_session)
    user_to_delete = user_service.create_user(user_to_delete_schema)

    response = client.delete(f"/api/v1/users/{user_to_delete.id}", headers=headers)
    assert response.status_code == 200
    assert response.json() == {"detail": "User deleted"}

    # Verify user is actually deleted
    response = client.get(f"/api/v1/users/{user_to_delete.id}", headers=headers)
    assert response.status_code == 404

def test_delete_user_not_found(client: TestClient, tmp_user):
    """
    Test deleting a non-existent user.
    """
    login_response = client.post("/api/v1/auth/login", json={"login": "testuser", "password": "password"})
    access_token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {access_token}"}

    response = client.delete("/api/v1/users/99999", headers=headers)
    assert response.status_code == 404
