from fastapi.testclient import TestClient
from app.users.local.schemas import CreateUserSchema, UpdateUserSchema
from app.users.local.services import UserService
from app.users.models import Group, User

def test_list_users_unauthenticated(client: TestClient):
    """
    Test that listing users requires authentication.
    """
    response = client.get("/api/v1/users/")
    assert response.status_code == 401

def test_list_users_success(authenticated_client: TestClient):
    """
    Test successfully listing users.
    """
    response = authenticated_client.get("/api/v1/users/")
    assert response.status_code == 200
    json_response = response.json()
    assert "users" in json_response
    assert "total" in json_response
    assert isinstance(json_response["users"], list)
    assert len(json_response["users"]) > 0
    for user in json_response["users"]:
        assert "groups" in user
        assert isinstance(user["groups"], list)

def test_get_user_by_id_success(authenticated_client: TestClient, tmp_user):
    """
    Test getting a user by ID successfully.
    """
    response = authenticated_client.get(f"/api/v1/users/{tmp_user.id}")
    assert response.status_code == 200
    user_data = response.json()
    assert user_data["id"] == tmp_user.id
    assert user_data["login"] == tmp_user.login
    assert "groups" in user_data
    assert isinstance(user_data["groups"], list)


def test_get_user_by_id_not_found(authenticated_client: TestClient):
    """
    Test getting a non-existent user by ID.
    """
    response = authenticated_client.get("/api/v1/users/99999") # Assuming 99999 is a non-existent ID
    assert response.status_code == 404

def test_get_user_by_login_success(authenticated_client: TestClient, tmp_user):
    """
    Test getting a user by login successfully.
    """
    response = authenticated_client.get(f"/api/v1/users/by-login/{tmp_user.login}")
    assert response.status_code == 200
    user_data = response.json()
    assert user_data["id"] == tmp_user.id
    assert user_data["login"] == tmp_user.login
    assert "groups" in user_data
    assert isinstance(user_data["groups"], list)

def test_get_user_by_login_not_found(authenticated_client: TestClient):
    """
    Test getting a non-existent user by login.
    """
    response = authenticated_client.get("/api/v1/users/by-login/nonexistent")
    assert response.status_code == 404

def test_create_user_success(authenticated_client: TestClient):
    """
    Test creating a new user successfully.
    """
    new_user_data = {
        "login": "newuser",
        "password": "newpassword",
        "name": "New User",
        "is_active": True,
        "type": "local"
    }
    response = authenticated_client.post("/api/v1/users/", json=new_user_data)
    assert response.status_code == 200
    user_data = response.json()
    assert user_data["login"] == "newuser"
    assert user_data["name"] == "New User"
    assert user_data["groups"] == []

def test_create_user_duplicate_login(authenticated_client: TestClient, tmp_user):
    """
    Test creating a user with a duplicate login.
    """
    duplicate_user_data = {
        "login": "testuser", # Duplicate login
        "password": "somepassword",
        "name": "Another User"
    }
    response = authenticated_client.post("/api/v1/users/", json=duplicate_user_data)
    assert response.status_code == 400 

def test_update_user_success(authenticated_client: TestClient, db_session):
    """
    Test updating an existing user successfully.
    """
    user_to_update_schema = CreateUserSchema(login="tobeupdated", password="password", name="To Be Updated")
    user_service = UserService(db_session)
    user_to_update = user_service.create_user(user_to_update_schema)

    updated_data = {
        "name": "Updated Name",
        "is_active": False
    }
    response = authenticated_client.put(f"/api/v1/users/{user_to_update.id}", json=updated_data)
    assert response.status_code == 200
    user_data = response.json()
    assert user_data["name"] == "Updated Name"
    assert user_data["is_active"] == False
    assert "groups" in user_data

def test_update_user_not_found(authenticated_client: TestClient):
    """
    Test updating a non-existent user.
    """
    updated_data = { "name": "Non Existent" }
    response = authenticated_client.put("/api/v1/users/99999", json=updated_data)
    assert response.status_code == 404

def test_delete_user_success(authenticated_client: TestClient, db_session):
    """
    Test deleting an existing user successfully.
    """
    user_to_delete_schema = CreateUserSchema(login="tobedeleted", password="password", name="To Be Deleted")
    user_service = UserService(db_session)
    user_to_delete = user_service.create_user(user_to_delete_schema)

    response = authenticated_client.delete(f"/api/v1/users/{user_to_delete.id}")
    assert response.status_code == 200
    assert response.json() == {"detail": "User deleted"}

    # Verify user is actually deleted
    response = authenticated_client.get(f"/api/v1/users/{user_to_delete.id}")
    assert response.status_code == 404

def test_delete_user_not_found(authenticated_client: TestClient):
    """
    Test deleting a non-existent user.
    """
    response = authenticated_client.delete("/api/v1/users/99999")
    assert response.status_code == 404

def test_create_user_with_groups(authenticated_client: TestClient, db_session):
    """
    Test creating a user and assigning them to groups.
    """
    # 1. Create some groups to assign
    group1 = Group(name="testgroup1", description="Test Group 1")
    group2 = Group(name="testgroup2", description="Test Group 2")
    db_session.add_all([group1, group2])
    db_session.commit()
    db_session.refresh(group1)
    db_session.refresh(group2)

    # 2. Define new user data with group_ids
    new_user_data = {
        "login": "userwithgroups",
        "password": "password",
        "name": "User With Groups",
        "group_ids": [group1.id, group2.id]
    }

    # 3. Create user via API
    response = authenticated_client.post("/api/v1/users/", json=new_user_data)
    assert response.status_code == 200
    created_user_data = response.json()
    assert created_user_data["login"] == "userwithgroups"
    
    # 4. Verify response payload
    assert len(created_user_data["groups"]) == 2
    response_group_names = {g["name"] for g in created_user_data["groups"]}
    assert response_group_names == {"testgroup1", "testgroup2"}

    # 5. Verify in DB
    user_in_db = db_session.query(User).filter(User.id == created_user_data["id"]).one()
    assert len(user_in_db.groups) == 2
    db_group_names = {group.name for group in user_in_db.groups}
    assert db_group_names == {"testgroup1", "testgroup2"}

def test_update_user_groups(authenticated_client: TestClient, db_session):
    """
    Test updating a user's group membership.
    """
    # 1. Create groups and a user
    group1 = Group(name="group-a", description="Group A")
    group2 = Group(name="group-b", description="Group B")
    group3 = Group(name="group-c", description="Group C")
    
    user_to_update = User(login="updateuser", password="password", name="Update User", type="local")
    user_to_update.groups.append(group1)

    db_session.add_all([group1, group2, group3, user_to_update])
    db_session.commit()
    db_session.refresh(user_to_update)
    db_session.refresh(group2)
    db_session.refresh(group3)
    
    assert {g.name for g in user_to_update.groups} == {"group-a"}

    # 2. Update user to have group B and C instead of A
    update_data = {"group_ids": [group2.id, group3.id]}
    response = authenticated_client.put(f"/api/v1/users/{user_to_update.id}", json=update_data)
    assert response.status_code == 200
    response_data = response.json()
    response_group_names = {g["name"] for g in response_data["groups"]}
    assert response_group_names == {"group-b", "group-c"}


    # 3. Verify in DB
    db_session.refresh(user_to_update)
    assert {g.name for g in user_to_update.groups} == {"group-b", "group-c"}

    # 4. Update user to have no groups
    update_data_empty = {"group_ids": []}
    response_empty = authenticated_client.put(f"/api/v1/users/{user_to_update.id}", json=update_data_empty)
    assert response_empty.status_code == 200
    assert response_empty.json()["groups"] == []

    # 5. Verify in DB
    db_session.refresh(user_to_update)
    assert len(user_to_update.groups) == 0

def test_create_user_with_invalid_group_id(authenticated_client: TestClient):
    """
    Test creating a user with a non-existent group ID fails.
    """
    new_user_data = {
        "login": "invalidgroupuser",
        "password": "password",
        "name": "Invalid Group User",
        "group_ids": [9999] # Non-existent group
    }
    response = authenticated_client.post("/api/v1/users/", json=new_user_data)
    assert response.status_code == 400
    assert "One or more group IDs are invalid" in response.json()["detail"]

def test_update_user_with_invalid_group_id(authenticated_client: TestClient, tmp_user, db_session):
    """
    Test updating a user with a non-existent group ID fails.
    """
    valid_group = Group(name="valid_group_for_test", description="A valid group")
    db_session.add(valid_group)
    db_session.commit()
    db_session.refresh(valid_group)
    
    update_data = {"group_ids": [valid_group.id, 9999]} # 9999 is a non-existent group
    response = authenticated_client.put(f"/api/v1/users/{tmp_user.id}", json=update_data)
    assert response.status_code == 400
    assert "One or more group IDs are invalid" in response.json()["detail"]
