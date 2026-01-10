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

def test_update_built_in_user_name(authenticated_client: TestClient):
    admin_user = authenticated_client.get("/api/v1/users/by-login/admin").json()
    response = authenticated_client.put(f"/api/v1/users/{admin_user['id']}", json={"name": "newname"})
    assert response.status_code == 400
    assert response.json()["detail"] == "Cannot change name of a built-in user"

def test_update_built_in_user_is_active(authenticated_client: TestClient):
    admin_user = authenticated_client.get("/api/v1/users/by-login/admin").json()
    response = authenticated_client.put(f"/api/v1/users/{admin_user['id']}", json={"is_active": False})
    assert response.status_code == 400
    assert response.json()["detail"] == "Cannot change is_active of a built-in user"

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

def test_unauthorized_create_group(non_admin_client: TestClient):
    response = non_admin_client.post("/api/v1/groups/", json={"name": "forbidden_group", "description": "Forbidden group"})
    assert response.status_code == 403
    assert response.json()["detail"] == "You do not have permission to perform this action"

def test_unauthorized_update_group(authenticated_client: TestClient, non_admin_client: TestClient):
    # First, create a non-built-in group as an admin
    create_response = authenticated_client.post("/api/v1/groups/", json={"name": "updatable_group", "description": "Group to update"})
    assert create_response.status_code == 200 # Admin should be able to create
    group_id = create_response.json()["id"]

    # Now, attempt to update it as a non-admin
    response = non_admin_client.put(f"/api/v1/groups/{group_id}", json={"name": "new_name"})
    assert response.status_code == 403
    assert response.json()["detail"] == "You do not have permission to perform this action"

def test_unauthorized_delete_group(authenticated_client: TestClient, non_admin_client: TestClient):
    # First, create a non-built-in group as an admin
    create_response = authenticated_client.post("/api/v1/groups/", json={"name": "deletable_group", "description": "Group to delete"})
    assert create_response.status_code == 200 # Admin should be able to create
    group_id = create_response.json()["id"]

    # Now, attempt to delete it as a non-admin
    response = non_admin_client.delete(f"/api/v1/groups/{group_id}")
    assert response.status_code == 403
    assert response.json()["detail"] == "You do not have permission to perform this action"

def test_unauthorized_create_role(non_admin_client: TestClient):
    response = non_admin_client.post("/api/v1/roles/", json={"name": "forbidden_role", "description": "Forbidden role"})
    assert response.status_code == 403
    assert response.json()["detail"] == "You do not have permission to perform this action"

def test_unauthorized_update_role(authenticated_client: TestClient, non_admin_client: TestClient):
    # First, create a non-built-in role as an admin
    create_response = authenticated_client.post("/api/v1/roles/", json={"name": "updatable_role", "description": "Role to update"})
    assert create_response.status_code == 200 # Admin should be able to create
    role_id = create_response.json()["id"]

    # Now, attempt to update it as a non-admin
    response = non_admin_client.put(f"/api/v1/roles/{role_id}", json={"name": "new_name"})
    assert response.status_code == 403
    assert response.json()["detail"] == "You do not have permission to perform this action"

def test_unauthorized_delete_role(authenticated_client: TestClient, non_admin_client: TestClient):
    # First, create a non-built-in role as an admin
    create_response = authenticated_client.post("/api/v1/roles/", json={"name": "deletable_role", "description": "Role to delete"})
    assert create_response.status_code == 200 # Admin should be able to create
    role_id = create_response.json()["id"]

    # Now, attempt to delete it as a non-admin
    response = non_admin_client.delete(f"/api/v1/roles/{role_id}")
    assert response.status_code == 403
    assert response.json()["detail"] == "You do not have permission to perform this action"
    
def test_assign_permissions_to_role(db_session, tmp_role, tmp_permission):
    """
    Test assigning permissions to a role and verifying their presence.
    """
    # Create a permission
    permission = tmp_permission(name="test:read")
    
    # Create a role and assign the permission
    role = tmp_role(name="viewer", permissions=["test:read"])

    # Verify the permission is in the role
    assert permission in role.permissions

    # Test assigning a non-existent permission (should create it and add it)
    nonexistent_perm_name = "nonexistent:perm"
    role_with_nonexistent_perm = tmp_role(name="bad_role", permissions=[nonexistent_perm_name])
    
    # Verify the nonexistent permission was created and is in the role
    created_nonexistent_permission = db_session.query(Permission).filter(Permission.name == nonexistent_perm_name).first()
    assert created_nonexistent_permission is not None
    assert created_nonexistent_permission in role_with_nonexistent_perm.permissions


def test_assign_roles_to_group_and_check_non_existent_role(authenticated_client: TestClient, tmp_group, tmp_role):
    """
    Test assigning roles to a group and verifying their presence.
    Also test behavior when attempting to assign a non-existent role.
    """
    # 1. Create a new group
    group_name = "test_group_for_roles"
    create_group_response = authenticated_client.post(
        "/api/v1/groups/", json={"name": group_name, "description": "Group for role assignment"}
    )
    assert create_group_response.status_code == 200
    created_group_id = create_group_response.json()["id"]

    # 2. Create a new role
    role_name = "test_role_for_group"
    create_role_response = authenticated_client.post(
        "/api/v1/roles/", json={"name": role_name, "description": "Role to be assigned to group"}
    )
    assert create_role_response.status_code == 200
    created_role_id = create_role_response.json()["id"]

    # 3. Update the created group to assign the new role to it
    update_group_response = authenticated_client.put(
        f"/api/v1/groups/{created_group_id}", json={"roles": [created_role_id]}
    )
    assert update_group_response.status_code == 200
    updated_group_data = update_group_response.json()
    
    # 4. Verify that the role is now associated with the group
    assert any(role["id"] == created_role_id for role in updated_group_data["roles"])

    # Verify by fetching the group again
    get_group_response = authenticated_client.get(f"/api/v1/groups/{created_group_id}")
    assert get_group_response.status_code == 200
    fetched_group_data = get_group_response.json()
    assert any(role["id"] == created_role_id for role in fetched_group_data["roles"])

    # Validation: Check behavior when attempting to assign a non-existent role
    non_existent_role_id = 99999  # Assuming this ID does not exist
    update_group_with_bad_role_response = authenticated_client.put(
        f"/api/v1/groups/{created_group_id}", json={"roles": [created_role_id, non_existent_role_id]}
    )
    # The current implementation of GroupService will silently ignore non-existent roles when updating
    # (it only adds roles that exist, and removes ones that are not in the provided list but previously existed).
    # It does not raise an error for trying to add a non-existent role.
    # Therefore, the expectation is still 200 OK, but the non-existent role should not be present.
    assert update_group_with_bad_role_response.status_code == 200
    updated_group_with_bad_role_data = update_group_with_bad_role_response.json()
    assert not any(role["id"] == non_existent_role_id for role in updated_group_with_bad_role_data["roles"])
    assert any(role["id"] == created_role_id for role in updated_group_with_bad_role_data["roles"]) # Original role should still be there

def test_assign_groups_to_user_and_check_non_existent_group(authenticated_client: TestClient, user_factory, tmp_group):
    """
    Test assigning groups to a user and verifying their presence.
    Also test behavior when attempting to assign a non-existent group.
    """
    # 1. Create a new user
    user_login = "user_with_groups"
    create_user_response = authenticated_client.post(
        "/api/v1/users/", json={"login": user_login, "password": "password", "name": "User with Groups"}
    )
    assert create_user_response.status_code == 200
    created_user_id = create_user_response.json()["id"]

    # 2. Create a new group
    group_name = "test_group_for_user"
    create_group_response = authenticated_client.post(
        "/api/v1/groups/", json={"name": group_name, "description": "Group for user assignment"}
    )
    assert create_group_response.status_code == 200
    created_group_id = create_group_response.json()["id"]

    # 3. Update the created user to assign the new group to them
    update_user_response = authenticated_client.put(
        f"/api/v1/users/{created_user_id}", json={"group_ids": [created_group_id]}
    )
    assert update_user_response.status_code == 200
    updated_user_data = update_user_response.json()
    
    # 4. Verify that the group is now associated with the user
    assert any(group["id"] == created_group_id for group in updated_user_data["groups"])

    # Verify by fetching the user again
    get_user_response = authenticated_client.get(f"/api/v1/users/{created_user_id}")
    assert get_user_response.status_code == 200
    fetched_user_data = get_user_response.json()
    assert any(group["id"] == created_group_id for group in fetched_user_data["groups"])

    # Validation: Check behavior when attempting to assign a non-existent group
    non_existent_group_id = 99999  # Assuming this ID does not exist
    update_user_with_bad_group_response = authenticated_client.put(
        f"/api/v1/users/{created_user_id}", json={"group_ids": [created_group_id, non_existent_group_id]}
    )
    # UserService explicitly raises 400 Bad Request for non-existent group IDs
    assert update_user_with_bad_group_response.status_code == 400
    assert "One or more group IDs are invalid." in update_user_with_bad_group_response.json()["detail"]

def test_permission_inheritance_through_groups_and_roles(authenticated_client: TestClient, user_factory, tmp_group, tmp_role, tmp_permission, db_session):
    """
    Test permission inheritance through a chain: User -> Group -> Role -> Permission.
    Verify that a user with the correct permission can access a protected endpoint,
    and a user without the correct permission cannot.
    """
    # Scenario 1: User with 'users:view' permission
    # 1. Create permission
    view_permission_name = "users:view"
    view_permission = tmp_permission(name=view_permission_name, description="View users")

    # 2. Create role and assign permission
    viewer_role_name = "viewer_role"
    viewer_role = tmp_role(name=viewer_role_name, permissions=[view_permission_name])
    
    # 3. Create group and assign role
    viewer_group_name = "viewer_group"
    viewer_group = tmp_group(name=viewer_group_name, description="Group for viewers")
    # Assign role to group
    authenticated_client.put(f"/api/v1/groups/{viewer_group.id}", json={"roles": [viewer_role.id]})
    
    # 4. Create user and assign group
    viewer_user_login = "viewer_user"
    viewer_password = "password123"
    viewer_user = user_factory(login=viewer_user_login, password=viewer_password, name="Viewer User", groups=[viewer_group_name])

    # 5. Log in as this user to get an access_token
    login_response = authenticated_client.post(
        "/api/v1/auth/login",
        json={"login": viewer_user_login, "password": viewer_password}
    )
    assert login_response.status_code == 200
    viewer_access_token = login_response.json()["access_token"]
    viewer_client = TestClient(authenticated_client.app) # Create a new client to set header
    viewer_client.headers["Authorization"] = f"Bearer {viewer_access_token}"

    # 6. Use this user's access_token to make a GET request to /api/v1/users/{user_id}/permissions_report
    #    and verify access.
    permissions_report_response = viewer_client.get(f"/api/v1/users/{viewer_user.id}/permissions_report")
    assert permissions_report_response.status_code == 200
    report_data = permissions_report_response.json()
    assert any(p["name"] == view_permission_name for p in report_data["all_unique_permissions"])

    # Also test access to /api/v1/users/ (requires users:view)
    list_users_response = viewer_client.get("/api/v1/users/")
    assert list_users_response.status_code == 200
    assert "users" in list_users_response.json()

    # Scenario 2: User without 'users:view' permission, attempting to access 'users:view' protected endpoint
    # 1. Create a different permission
    create_permission_name = "users:create"
    create_permission = tmp_permission(name=create_permission_name, description="Create users")

    # 2. Create role and assign only 'users:create' permission
    creator_role_name = "creator_role"
    creator_role = tmp_role(name=creator_role_name, permissions=[create_permission_name])

    # 3. Create group and assign role
    creator_group_name = "creator_group"
    creator_group = tmp_group(name=creator_group_name, description="Group for creators")
    # Assign role to group
    authenticated_client.put(f"/api/v1/groups/{creator_group.id}", json={"roles": [creator_role.id]})

    # 4. Create user and assign group
    creator_user_login = "creator_user"
    creator_password = "password456"
    creator_user = user_factory(login=creator_user_login, password=creator_password, name="Creator User", groups=[creator_group_name])

    # 5. Log in as this user to get an access_token
    login_response_creator = authenticated_client.post(
        "/api/v1/auth/login",
        json={"login": creator_user_login, "password": creator_password}
    )
    assert login_response_creator.status_code == 200
    creator_access_token = login_response_creator.json()["access_token"]
    creator_client = TestClient(authenticated_client.app) # Create a new client
    creator_client.headers["Authorization"] = f"Bearer {creator_access_token}"

    # 6. Use this user's access_token to make a GET request to /api/v1/users/
    #    Expect 403 Forbidden because they only have 'users:create', not 'users:view'
    list_users_response_creator = creator_client.get("/api/v1/users/")
    assert list_users_response_creator.status_code == 403
    assert list_users_response_creator.json()["detail"] == "You do not have permission to perform this action"

    # Also check their own permissions report (they should get 403 for permissions report since it also requires users:view)
    permissions_report_response_creator = creator_client.get(f"/api/v1/users/{creator_user.id}/permissions_report")
    assert permissions_report_response_creator.status_code == 403
    assert permissions_report_response_creator.json()["detail"] == "You do not have permission to perform this action"

def test_create_group_with_empty_name(authenticated_client: TestClient):
    """
    Test creating a group with an empty name.
    Expect a 422 Unprocessable Entity error due to validation.
    """
    response = authenticated_client.post("/api/v1/groups/", json={"name": "", "description": "Group with empty name"})
    assert response.status_code == 422
    assert "name" in response.json()["detail"][0]["loc"]
    assert "String should have at least 3 characters" in response.json()["detail"][0]["msg"]

def test_create_group_with_missing_name(authenticated_client: TestClient):
    """
    Test creating a group with a missing name field.
    Expect a 422 Unprocessable Entity error due to validation.
    """
    response = authenticated_client.post("/api/v1/groups/", json={"description": "Group with missing name"})
    assert response.status_code == 422
    assert "name" in response.json()["detail"][0]["loc"]
    assert "Field required" in response.json()["detail"][0]["msg"]

def test_create_role_with_empty_name(authenticated_client: TestClient):
    """
    Test creating a role with an empty name.
    Expect a 422 Unprocessable Entity error due to validation.
    """
    response = authenticated_client.post("/api/v1/roles/", json={"name": "", "description": "Role with empty name"})
    assert response.status_code == 422
    assert "name" in response.json()["detail"][0]["loc"]
    assert "String should have at least 3 characters" in response.json()["detail"][0]["msg"]

def test_create_role_with_missing_name(authenticated_client: TestClient):
    """
    Test creating a role with a missing name field.
    Expect a 422 Unprocessable Entity error due to validation.
    """
    response = authenticated_client.post("/api/v1/roles/", json={"description": "Role with missing name"})
    assert response.status_code == 422
    assert "name" in response.json()["detail"][0]["loc"]
    assert "Field required" in response.json()["detail"][0]["msg"]