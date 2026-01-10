from fastapi.testclient import TestClient
from app.users.local.schemas import CreateUserSchema, UpdateUserSchema
from app.users.local.services import UserService
from app.users.models import Group, User
import pytest


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


@pytest.fixture
def create_multiple_users(authenticated_client: TestClient):
    """
    Fixture to create multiple test users for pagination testing.
    """
    users = []
    # Create 10 users plus the default admin user makes 11
    for i in range(10):
        user_data = {
            "login": f"paginate_user_{i}",
            "password": "password",
            "name": f"Paginate User {i}",
            "is_active": True,
            "type": "local"
        }
        response = authenticated_client.post("/api/v1/users/", json=user_data)
        assert response.status_code == 200
        users.append(response.json())
    return users


def test_list_users_pagination_skip_limit(authenticated_client: TestClient, create_multiple_users):
    """
    Test listing users with skip and limit parameters.
    """
    # Get all users first to establish a baseline. The default admin user is always present.
    all_users_response = authenticated_client.get("/api/v1/users/", params={"skip": 0, "limit": 1000})
    all_users_data = all_users_response.json()["users"]
    total_users_count = len(all_users_data)
    
    # Ensure there are enough users for testing
    assert total_users_count >= 11 # Default admin + 10 created users

    # Test skip=0, limit=3
    response_s0l3 = authenticated_client.get("/api/v1/users/", params={"skip": 0, "limit": 3})
    assert response_s0l3.status_code == 200
    json_response_s0l3 = response_s0l3.json()
    assert len(json_response_s0l3["users"]) == 3
    assert json_response_s0l3["total"] == total_users_count
    assert [user["id"] for user in json_response_s0l3["users"]] == [user["id"] for user in all_users_data[0:3]]

    # Test skip=3, limit=3
    response_s3l3 = authenticated_client.get("/api/v1/users/", params={"skip": 3, "limit": 3})
    assert response_s3l3.status_code == 200
    json_response_s3l3 = response_s3l3.json()
    assert len(json_response_s3l3["users"]) == 3
    assert json_response_s3l3["total"] == total_users_count
    assert [user["id"] for user in json_response_s3l3["users"]] == [user["id"] for user in all_users_data[3:6]]

    # Test skip=total_users - 2, limit=5 (should return last 2 users)
    response_last_two = authenticated_client.get("/api/v1/users/", params={"skip": total_users_count - 2, "limit": 5})
    assert response_last_two.status_code == 200
    json_response_last_two = response_last_two.json()
    assert len(json_response_last_two["users"]) == 2
    assert json_response_last_two["total"] == total_users_count
    assert [user["id"] for user in json_response_last_two["users"]] == [user["id"] for user in all_users_data[total_users_count - 2:]]


def test_list_users_pagination_beyond_total(authenticated_client: TestClient, create_multiple_users):
    """
    Test listing users with skip and limit parameters that go beyond the total count.
    """
    total_users_response = authenticated_client.get("/api/v1/users/", params={"skip": 0, "limit": 1000}) # Get all users to find total
    total_users = total_users_response.json()["total"]

    # Test skip beyond total (should return empty list)
    response_skip_beyond = authenticated_client.get("/api/v1/users/", params={"skip": total_users + 10, "limit": 5})
    assert response_skip_beyond.status_code == 200
    json_response_skip_beyond = response_skip_beyond.json()
    assert len(json_response_skip_beyond["users"]) == 0
    assert json_response_skip_beyond["total"] == total_users # Total should still be correct

    # Test limit very high (should return all available from skip point)
    response_high_limit = authenticated_client.get("/api/v1/users/", params={"skip": 0, "limit": 1000})
    assert response_high_limit.status_code == 200
    json_response_high_limit = response_high_limit.json()
    assert len(json_response_high_limit["users"]) == total_users
    assert json_response_high_limit["total"] == total_users


def test_unauthorized_get_user_by_id(non_admin_client: TestClient, tmp_user):
    """
    Test that a non-admin user cannot get another user by ID.
    """
    response = non_admin_client.get(f"/api/v1/users/{tmp_user.id}")
    assert response.status_code == 403
    assert response.json()["detail"] == "You do not have permission to perform this action"

def test_unauthorized_update_user(non_admin_client: TestClient, tmp_user):
    """
    Test that a non-admin user cannot update another user.
    """
    update_data = {"name": "Unauthorized Update"}
    response = non_admin_client.put(f"/api/v1/users/{tmp_user.id}", json=update_data)
    assert response.status_code == 403
    assert response.json()["detail"] == "You do not have permission to perform this action"

def test_unauthorized_delete_user(non_admin_client: TestClient, tmp_user):
    """
    Test that a non-admin user cannot delete another user.
    """
    response = non_admin_client.delete(f"/api/v1/users/{tmp_user.id}")
    assert response.status_code == 403
    assert response.json()["detail"] == "You do not have permission to perform this action"

def test_non_admin_get_self_by_id(authenticated_client: TestClient, user_factory):
    """
    Test that a non-admin user can get their own user information by ID.
    """
    # Create a non-admin user
    non_admin_login = "self_user_test"
    non_admin_password = "password"
    non_admin_user_data = user_factory(login=non_admin_login, password=non_admin_password, name="Self User Test")

    # Log in as this user
    login_response = authenticated_client.post(
        "/api/v1/auth/login",
        json={"login": non_admin_login, "password": non_admin_password}
    )
    assert login_response.status_code == 200
    access_token = login_response.json()["access_token"]
    
    non_admin_client_self = TestClient(authenticated_client.app)
    non_admin_client_self.headers["Authorization"] = f"Bearer {access_token}"

    # Attempt to get their own user info
    response = non_admin_client_self.get(f"/api/v1/users/{non_admin_user_data.id}")
    assert response.status_code == 200
    assert response.json()["id"] == non_admin_user_data.id
    assert response.json()["login"] == non_admin_login

def test_update_user_duplicate_login(authenticated_client: TestClient, user_factory):
    """
    Test that updating a user's login to an already existing login fails.
    """
    # Create two users
    user1_login = "user_for_update_1"
    user2_login = "user_for_update_2"
    user1 = user_factory(login=user1_login, password="password1", name="User One")
    user2 = user_factory(login=user2_login, password="password2", name="User Two")

    # Attempt to update user1's login to user2's login
    response = authenticated_client.put(
        f"/api/v1/users/{user1.id}", 
        json={"login": user2_login}
    )
    assert response.status_code == 400
    assert "User with this login already exists" in response.json()["detail"]

# --- New Validation Tests ---

def test_create_user_validation_short_login(authenticated_client: TestClient):
    """
    Test creating a user with a login shorter than min_length (3).
    """
    new_user_data = {
        "login": "ab", # Too short
        "password": "password",
        "name": "Short Login User"
    }
    response = authenticated_client.post("/api/v1/users/", json=new_user_data)
    assert response.status_code == 422
    assert "login" in response.json()["detail"][0]["loc"]
    assert "String should have at least 3 characters" in response.json()["detail"][0]["msg"]

def test_create_user_validation_short_password(authenticated_client: TestClient):
    """
    Test creating a user with a password shorter than min_length (3).
    """
    new_user_data = {
        "login": "short_pass_user",
        "password": "ab", # Too short
        "name": "Short Password User"
    }
    response = authenticated_client.post("/api/v1/users/", json=new_user_data)
    assert response.status_code == 422
    assert "password" in response.json()["detail"][0]["loc"]
    assert "String should have at least 3 characters" in response.json()["detail"][0]["msg"]

def test_create_user_validation_missing_login(authenticated_client: TestClient):
    """
    Test creating a user with a missing login field.
    """
    new_user_data = {
        "password": "password",
        "name": "Missing Login User"
    }
    response = authenticated_client.post("/api/v1/users/", json=new_user_data)
    assert response.status_code == 422
    assert "login" in response.json()["detail"][0]["loc"]
    assert "Field required" in response.json()["detail"][0]["msg"]

def test_create_user_validation_missing_password(authenticated_client: TestClient):
    """
    Test creating a user with a missing password field.
    """
    new_user_data = {
        "login": "missing_pass_user",
        "name": "Missing Password User"
    }
    response = authenticated_client.post("/api/v1/users/", json=new_user_data)
    assert response.status_code == 422
    assert "password" in response.json()["detail"][0]["loc"]
    assert "Field required" in response.json()["detail"][0]["msg"]

def test_update_user_validation_short_login(authenticated_client: TestClient, user_factory):
    """
    Test updating a user's login to a value shorter than min_length (3).
    """
    user_to_update = user_factory(login="updatelogin", password="password", name="Update Login User")
    update_data = {"login": "ab"} # Too short
    response = authenticated_client.put(f"/api/v1/users/{user_to_update.id}", json=update_data)
    assert response.status_code == 422
    assert "login" in response.json()["detail"][0]["loc"]
    assert "String should have at least 3 characters" in response.json()["detail"][0]["msg"]

def test_update_user_validation_short_password(authenticated_client: TestClient, user_factory):
    """
    Test updating a user's password to a value shorter than min_length (3).
    """
    user_to_update = user_factory(login="updatepass", password="password", name="Update Password User")
    update_data = {"password": "ab"} # Too short
    response = authenticated_client.put(f"/api/v1/users/{user_to_update.id}", json=update_data)
    assert response.status_code == 422
    assert "password" in response.json()["detail"][0]["loc"]
    assert "String should have at least 3 characters" in response.json()["detail"][0]["msg"]

def test_non_admin_cannot_change_own_type(authenticated_client: TestClient, user_factory):
    """
    Test that a non-admin user cannot change their own 'type' field.
    """
    # Create a non-admin user
    regular_user_login = "regular_type_changer"
    regular_user_password = "password"
    regular_user = user_factory(login=regular_user_login, password=regular_user_password, name="Regular User")

    # Log in as this user
    login_response = authenticated_client.post(
        "/api/v1/auth/login",
        json={"login": regular_user_login, "password": regular_user_password}
    )
    assert login_response.status_code == 200
    access_token = login_response.json()["access_token"]
    
    regular_client = TestClient(authenticated_client.app)
    regular_client.headers["Authorization"] = f"Bearer {access_token}"

    # Attempt to change own 'type'
    response = regular_client.put(f"/api/v1/users/{regular_user.id}", json={"type": "ldap"})
    assert response.status_code == 403
    assert response.json()["detail"] == "You do not have permission to perform this action"

def test_non_admin_cannot_change_own_is_active(authenticated_client: TestClient, user_factory):
    """
    Test that a non-admin user cannot change their own 'is_active' field.
    """
    # Create a non-admin user
    regular_user_login = "regular_active_changer"
    regular_user_password = "password"
    regular_user = user_factory(login=regular_user_login, password=regular_user_password, name="Regular Active User")

    # Log in as this user
    login_response = authenticated_client.post(
        "/api/v1/auth/login",
        json={"login": regular_user_login, "password": regular_user_password}
    )
    assert login_response.status_code == 200
    access_token = login_response.json()["access_token"]
    
    regular_client = TestClient(authenticated_client.app)
    regular_client.headers["Authorization"] = f"Bearer {access_token}"

    # Attempt to change own 'is_active'
    response = regular_client.put(f"/api/v1/users/{regular_user.id}", json={"is_active": False})
    assert response.status_code == 403
    assert response.json()["detail"] == "You do not have permission to perform this action"