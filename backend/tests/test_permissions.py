from fastapi.testclient import TestClient

def test_list_permissions_unauthenticated(client: TestClient):
    """
    Test that listing permissions requires authentication.
    """
    response = client.get("/api/v1/permissions/")
    assert response.status_code == 401

def test_list_permissions_success(client: TestClient, tmp_user):
    """
    Test successfully listing all available permissions.
    This test will fail with a 404 if the router is not being loaded correctly.
    """
    # Log in as the admin-like temporary user
    login_response = client.post("/api/v1/auth/login", json={"login": "testuser", "password": "password"})
    assert login_response.status_code == 200
    access_token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {access_token}"}

    # Make the request to the new endpoint
    response = client.get("/api/v1/permissions/", headers=headers)
    
    # Assert that the endpoint exists and is successful
    assert response.status_code == 200
    
    # Assert the response content
    json_response = response.json()
    assert isinstance(json_response, list)
    assert len(json_response) > 0
    
    # Check for a known permission
    permission_names = [p["name"] for p in json_response]
    assert "users:view" in permission_names
    assert "users:create" in permission_names
