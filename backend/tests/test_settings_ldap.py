
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from unittest.mock import patch

from app.settings.ldap.models import LdapSetting
from app.settings.ldap import services
from app.core.security import encrypt_value, decrypt_value
from ldap3.core.exceptions import LDAPInvalidDnError, LDAPInvalidFilterError, LDAPException

# --- Fixtures ---

@pytest.fixture
def ldap_settings_data(db_session: Session):
    """
    Fixture to create some initial LDAP settings.
    """
    settings_list = [
        LdapSetting(key="LDAP_URI", value="ldap://localhost:389", type="string", is_sensitive=False),
        LdapSetting(key="LDAP_BIND_DN", value="cn=admin,dc=example,dc=com", type="string", is_sensitive=False),
        LdapSetting(key="LDAP_BIND_PASSWORD", value="secret", type="password", is_sensitive=True), # Will be encrypted by service logic usually, but here we insert raw. 
        # Ideally we should use service to insert to test encryption, or manually encrypt here if we want to test read.
        # Let's insert raw here and assume encryption happens on update, or we can use service to setup.
        LdapSetting(key="LDAP_ENABLED", value="true", type="bool", is_sensitive=False),
        LdapSetting(key="LDAP_BASE_DN", value="ou=users,dc=example,dc=com", type="string", is_sensitive=False),
        LdapSetting(key="LDAP_USER_FILTER", value="(uid={username})", type="string", is_sensitive=False),
    ]
    
    # Manually encrypt password for the fixture to simulate real state
    for s in settings_list:
        if s.key == "LDAP_BIND_PASSWORD":
            s.value = encrypt_value(s.value)
    
    db_session.add_all(settings_list)
    db_session.commit()
    for s in settings_list:
        db_session.refresh(s)
    return settings_list

@pytest.fixture
def valid_ldap_test_data():
    """
    Valid LDAP settings for testing the connection.
    """
    return {
        "settings": {
            "LDAP_URI": "ldap://fake-ldap.com",
            "LDAP_BIND_DN": "cn=admin,dc=example,dc=com",
            "LDAP_BIND_PASSWORD": "password",
            "LDAP_BASE_DN": "ou=users,dc=example,dc=com",
            "LDAP_USER_FILTER": "(uid=testuser)"
        }
    }

# --- API Tests ---

def test_get_all_ldap_settings(authenticated_client: TestClient, ldap_settings_data):
    """
    Test 1.12.2: Successful retrieval of all LDAP Settings.
    """
    response = authenticated_client.get("/api/v1/settings/ldap")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= len(ldap_settings_data)
    
    # Check simple value
    uri_setting = next(s for s in data if s["key"] == "LDAP_URI")
    assert uri_setting["value"] == "ldap://localhost:389"
    
    # Check sensitive masking
    # Note: LdapSettingSchema needs masking logic similar to CoreSettingSchema
    pass_setting = next(s for s in data if s["key"] == "LDAP_BIND_PASSWORD")
    # If masking is implemented in schema (it should be!), this assertion will pass.
    # If not, we might need to implement it in schema first, similar to Core.
    # checking schema... it was NOT added in plan check for schema file. 
    # But usually schemas have some hiding logic. Let's assume we need to fix schema if this fails.
    # For now assertion:
    # assert pass_setting["value"] == "***" 
    assert pass_setting["value"] == "********"

def test_get_ldap_setting_by_key(authenticated_client: TestClient, ldap_settings_data):
    """
    Test 1.12.3: Successful retrieval of a single LDAP Setting.
    """
    response = authenticated_client.get("/api/v1/settings/ldap/LDAP_URI")
    assert response.status_code == 200
    data = response.json()
    assert data["key"] == "LDAP_URI"
    assert data["value"] == "ldap://localhost:389"

def test_update_ldap_setting(authenticated_client: TestClient, ldap_settings_data, db_session):
    """
    Test 1.12.4: Update LDAP Setting.
    """
    # 1. Update normal setting
    update_data = {"value": "ldap://new-host:389"}
    response = authenticated_client.put("/api/v1/settings/ldap/LDAP_URI", json=update_data)
    assert response.status_code == 200
    assert response.json()["value"] == "ldap://new-host:389"

    # 2. Update password (should be encrypted)
    new_pass = "new_secret_password"
    update_pass = {"value": new_pass}
    response = authenticated_client.put("/api/v1/settings/ldap/LDAP_BIND_PASSWORD", json=update_pass)
    assert response.status_code == 200
    
    # Verify in DB that it is encrypted
    db_pass = services.get_ldap_setting_by_key(db_session, "LDAP_BIND_PASSWORD")
    assert db_pass.value != new_pass
    assert decrypt_value(db_pass.value) == new_pass

def test_get_is_ldap_enabled(authenticated_client: TestClient, ldap_settings_data):
    """
    Test 1.12.5: Check is_enabled endpoint.
    """
    response = authenticated_client.get("/api/v1/settings/ldap/is_enabled")
    assert response.status_code == 200
    assert response.json() is True

# --- LDAP Connection Test API Tests (New) ---

def test_test_ldap_connection_success(authenticated_client: TestClient, valid_ldap_test_data):
    """
    Tests successful LDAP connection and search.
    """
    with patch('app.settings.ldap.services.Connection') as MockConnection:
        # Mock the connection instance
        mock_conn_instance = MockConnection.return_value
        # Simulate successful bind
        mock_conn_instance.bind.return_value = True
        # Simulate successful search (found at least one user)
        mock_conn_instance.search.return_value = True
        
        response = authenticated_client.post("/api/v1/settings/ldap/test", json=valid_ldap_test_data)
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "successful" in data["message"]
        # Ensure unbind was called
        mock_conn_instance.unbind.assert_called_once()


def test_test_ldap_connection_bind_fails(authenticated_client: TestClient, valid_ldap_test_data):
    """
    Tests LDAP connection when bind operation fails (e.g., bad credentials).
    """
    with patch('app.settings.ldap.services.Connection') as MockConnection:
        mock_conn_instance = MockConnection.return_value
        # Simulate failed bind
        mock_conn_instance.bind.return_value = False
        # Provide a result description for the bind failure
        mock_conn_instance.result = {'description': 'invalidCredentials'}
        
        response = authenticated_client.post("/api/v1/settings/ldap/test", json=valid_ldap_test_data)
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is False
        assert "Bind failed" in data["message"]
        assert "invalidCredentials" in data["message"]
        mock_conn_instance.unbind.assert_called_once() # Unbind should still be called


def test_test_ldap_connection_search_fails_no_results(authenticated_client: TestClient, valid_ldap_test_data):
    """
    Tests LDAP connection when search returns no results, but is otherwise successful.
    """
    with patch('app.settings.ldap.services.Connection') as MockConnection:
        mock_conn_instance = MockConnection.return_value
        mock_conn_instance.bind.return_value = True
        # Simulate search finding no entries
        mock_conn_instance.search.return_value = False 
        
        response = authenticated_client.post("/api/v1/settings/ldap/test", json=valid_ldap_test_data)
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is False
        assert "returned no results" in data["message"]
        mock_conn_instance.unbind.assert_called_once()


def test_test_ldap_connection_invalid_dn_error(authenticated_client: TestClient, valid_ldap_test_data):
    """
    Tests LDAP connection when an LDAPInvalidDnError occurs (e.g., bad BASE_DN).
    """
    # Patch the Connection constructor to raise LDAPInvalidDnError directly
    with patch('app.settings.ldap.services.Connection', side_effect=LDAPInvalidDnError("Invalid DN format")) as MockConnection:
        response = authenticated_client.post("/api/v1/settings/ldap/test", json=valid_ldap_test_data)
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is False
        assert "Invalid DN syntax" in data["message"]
        # In this case, Connection object might not be fully instantiated, so no unbind call
        MockConnection.assert_called_once() # Ensure Connection was attempted


def test_test_ldap_connection_invalid_filter_error(authenticated_client: TestClient, valid_ldap_test_data):
    """
    Tests LDAP connection when an LDAPInvalidFilterError occurs (e.g., bad USER_FILTER).
    """
    with patch('app.settings.ldap.services.Connection') as MockConnection:
        mock_conn_instance = MockConnection.return_value
        mock_conn_instance.bind.return_value = True
        # Simulate search raising an invalid filter error
        mock_conn_instance.search.side_effect = LDAPInvalidFilterError("Bad filter syntax")

        response = authenticated_client.post("/api/v1/settings/ldap/test", json=valid_ldap_test_data)
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is False
        assert "Invalid filter syntax" in data["message"]
        mock_conn_instance.unbind.assert_called_once()


def test_test_ldap_connection_generic_ldap_error(authenticated_client: TestClient, valid_ldap_test_data):
    """
    Tests LDAP connection when a generic LDAPException occurs (e.g., cannot connect to URI).
    """
    # Patch the Connection constructor to raise LDAPException
    with patch('app.settings.ldap.services.Connection', side_effect=LDAPException("Connection refused")) as MockConnection:
        response = authenticated_client.post("/api/v1/settings/ldap/test", json=valid_ldap_test_data)
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is False
        assert "Check LDAP_URI and connectivity" in data["message"]
        MockConnection.assert_called_once() # Ensure Connection was attempted

def test_test_ldap_connection_missing_settings(authenticated_client: TestClient):
    """
    Tests LDAP connection when essential settings are missing.
    """
    # Missing LDAP_URI
    test_data_missing_uri = {
        "settings": {
            "LDAP_BIND_DN": "cn=admin,dc=example,dc=com",
            "LDAP_BIND_PASSWORD": "password",
            "LDAP_BASE_DN": "ou=users,dc=example,dc=com",
            "LDAP_USER_FILTER": "(uid=testuser)"
        }
    }
    response = authenticated_client.post("/api/v1/settings/ldap/test", json=test_data_missing_uri)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is False
    assert "Missing required LDAP settings: uri" in data["message"]

    # Missing LDAP_BASE_DN
    test_data_missing_base_dn = {
        "settings": {
            "LDAP_URI": "ldap://fake-ldap.com",
            "LDAP_BIND_DN": "cn=admin,dc=example,dc=com",
            "LDAP_BIND_PASSWORD": "password",
            "LDAP_USER_FILTER": "(uid=testuser)"
        }
    }
    response = authenticated_client.post("/api/v1/settings/ldap/test", json=test_data_missing_base_dn)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is False
    assert "Missing required LDAP settings: base_dn" in data["message"]


# --- RBAC Tests ---

def test_permissions_ldap_is_enabled_public(client: TestClient, user_factory, ldap_settings_data):
    """
    Test 1.12.5/1.10.5: is_enabled should be accessible by any authenticated user.
    """
    # User without specific settings permissions
    user_factory(login="common_user", password="password")
    token_common = client.post("/api/v1/auth/login", json={"login": "common_user", "password": "password"}).json()["access_token"]
    
    client_common = TestClient(client.app)
    client_common.headers["Authorization"] = f"Bearer {token_common}"
    
    response = client_common.get("/api/v1/settings/ldap/is_enabled")
    assert response.status_code == 200

def test_permissions_ldap_others_protected(client: TestClient, user_factory, ldap_settings_data):
    """
    Test 1.12.7: Other endpoints should be protected.
    """
    user_factory(login="common_user_2", password="password")
    token_common = client.post("/api/v1/auth/login", json={"login": "common_user_2", "password": "password"}).json()["access_token"]
    
    client_common = TestClient(client.app)
    client_common.headers["Authorization"] = f"Bearer {token_common}"
    
    # Try GET list
    response = client_common.get("/api/v1/settings/ldap")
    assert response.status_code == 403
    response = client_common.put("/api/v1/settings/ldap/LDAP_URI", json={"value": "test"})
    assert response.status_code == 403
    # test_ldap_settings now requires settings:update permission
    response = client_common.post("/api/v1/settings/ldap/test", json={})
    assert response.status_code == 403


# --- Service/Model Tests ---

def test_service_encryption():
    """
    Test 1.12.8: Encryption logic helpers.
    """
    raw = "secret"
    encrypted = encrypt_value(raw)
    assert encrypted != raw
    assert decrypt_value(encrypted) == raw
    assert decrypt_value(encrypted) != "wrong"

def test_service_is_enabled(db_session: Session, ldap_settings_data):
    """
    Test is_ldap_enabled service.
    """
    assert services.is_ldap_enabled(db_session) is True
    
    # Change to false
    services.update_ldap_setting(db_session, "LDAP_ENABLED", "false")
    assert services.is_ldap_enabled(db_session) is False
