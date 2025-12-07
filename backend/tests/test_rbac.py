import pytest
from fastapi.testclient import TestClient
from app.users.models import User, Group, Role, Permission

def test_delete_built_in_user(authenticated_client: TestClient):
    admin_user = authenticated_client.get("/api/v1/users/by-login/admin").json()
    response = authenticated_client.delete(f"/api/v1/users/{admin_user['id']}")
    assert response.status_code == 400
    assert response.json()["detail"] == "Cannot delete a built-in user"

def test_delete_built_in_group(authenticated_client: TestClient):
    admins_group = authenticated_client.get("/api/v1/groups?skip=0&limit=1").json()["groups"][0]
    response = authenticated_client.delete(f"/api/v1/groups/{admins_group['id']}")
    assert response.status_code == 400
    assert response.json()["detail"] == "Cannot delete a built-in group"

def test_delete_built_in_role(authenticated_client: TestClient):
    admin_role = authenticated_client.get("/api/v1/roles?skip=0&limit=1").json()["roles"][0]
    response = authenticated_client.delete(f"/api/v1/roles/{admin_role['id']}")
    assert response.status_code == 400
    assert response.json()["detail"] == "Cannot delete a built-in role"

def test_update_built_in_user_login(authenticated_client: TestClient):
    admin_user = authenticated_client.get("/api/v1/users/by-login/admin").json()
    response = authenticated_client.put(f"/api/v1/users/{admin_user['id']}", json={"login": "newlogin"})
    assert response.status_code == 400
    assert response.json()["detail"] == "Cannot change login of a built-in user"

def test_update_built_in_group_name(authenticated_client: TestClient):
    admins_group = authenticated_client.get("/api/v1/groups?skip=0&limit=1").json()["groups"][0]
    response = authenticated_client.put(f"/api/v1/groups/{admins_group['id']}", json={"name": "newname"})
    assert response.status_code == 400
    assert response.json()["detail"] == "Cannot change name of a built-in group"

def test_update_built_in_role_name(authenticated_client: TestClient):
    admin_role = authenticated_client.get("/api/v1/roles?skip=0&limit=1").json()["roles"][0]
    response = authenticated_client.put(f"/api/v1/roles/{admin_role['id']}", json={"name": "newname"})
    assert response.status_code == 400
    assert response.json()["detail"] == "Cannot change name of a built-in role"

def test_create_group(authenticated_client: TestClient):
    response = authenticated_client.post("/api/v1/groups/", json={"name": "testgroup", "description": "Test group"})
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "testgroup"
    assert data["description"] == "Test group"
    assert data["id"] is not None

def test_get_group(authenticated_client: TestClient):
    response = authenticated_client.post("/api/v1/groups/", json={"name": "testgroup", "description": "Test group"})
    group_id = response.json()["id"]
    response = authenticated_client.get(f"/api/v1/groups/{group_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "testgroup"
    assert data["description"] == "Test group"

def test_update_group(authenticated_client: TestClient):
    response = authenticated_client.post("/api/v1/groups/", json={"name": "testgroup", "description": "Test group"})
    group_id = response.json()["id"]
    response = authenticated_client.put(f"/api/v1/groups/{group_id}", json={"name": "newtestgroup"})
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "newtestgroup"

def test_delete_group(authenticated_client: TestClient):
    response = authenticated_client.post("/api/v1/groups/", json={"name": "testgroup", "description": "Test group"})
    group_id = response.json()["id"]
    response = authenticated_client.delete(f"/api/v1/groups/{group_id}")
    assert response.status_code == 200
    response = authenticated_client.get(f"/api/v1/groups/{group_id}")
    assert response.status_code == 404

def test_create_role(authenticated_client: TestClient):
    response = authenticated_client.post("/api/v1/roles/", json={"name": "testrole", "description": "Test role"})
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "testrole"
    assert data["description"] == "Test role"
    assert data["id"] is not None

def test_get_role(authenticated_client: TestClient):
    response = authenticated_client.post("/api/v1/roles/", json={"name": "testrole", "description": "Test role"})
    role_id = response.json()["id"]
    response = authenticated_client.get(f"/api/v1/roles/{role_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "testrole"
    assert data["description"] == "Test role"

def test_update_role(authenticated_client: TestClient):
    response = authenticated_client.post("/api/v1/roles/", json={"name": "testrole", "description": "Test role"})
    role_id = response.json()["id"]
    response = authenticated_client.put(f"/api/v1/roles/{role_id}", json={"name": "newtestrole"})
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "newtestrole"

def test_delete_role(authenticated_client: TestClient):
    response = authenticated_client.post("/api/v1/roles/", json={"name": "testrole", "description": "Test role"})
    role_id = response.json()["id"]
    response = authenticated_client.delete(f"/api/v1/roles/{role_id}")
    assert response.status_code == 200
    response = authenticated_client.get(f"/api/v1/roles/{role_id}")
    assert response.status_code == 404
