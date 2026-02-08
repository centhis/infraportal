import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.settings.core import services
from app.settings.core.models import CoreSetting

# --- Fixtures ---


@pytest.fixture
def core_settings_data(db_session: Session):
    """
    Fixture to create some initial core settings.
    """
    settings_list = [
        CoreSetting(key="TEST_STRING", value="test_value", type="string", is_sensitive=False),
        CoreSetting(key="TEST_INT", value="123", type="int", is_sensitive=False),
        CoreSetting(key="TEST_BOOL", value="true", type="bool", is_sensitive=False),
        CoreSetting(key="TEST_JSON", value='{"foo": "bar"}', type="json", is_sensitive=False),
        CoreSetting(key="TEST_SENSITIVE", value="secret_value", type="string", is_sensitive=True),
    ]
    db_session.add_all(settings_list)
    db_session.commit()
    for s in settings_list:
        db_session.refresh(s)
    return settings_list


# --- API Tests ---


def test_get_all_core_settings(authenticated_client: TestClient, core_settings_data):
    """
    Test 1.11.2: Successful retrieval of all Core Settings.
    """
    response = authenticated_client.get("/api/v1/settings/core")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= len(core_settings_data)

    # Check simple value
    test_string = next(s for s in data if s["key"] == "TEST_STRING")
    assert test_string["value"] == "test_value"

    # Check sensitive masking
    test_sensitive = next(s for s in data if s["key"] == "TEST_SENSITIVE")
    assert (
        test_sensitive["value"] == "***"
    )  # Assuming masking logic returns *** or similar, or checking specific sensitive logic


def test_get_core_setting_by_key(authenticated_client: TestClient, core_settings_data):
    """
    Test 1.11.3: Successful retrieval of a single Core Setting.
    """
    response = authenticated_client.get("/api/v1/settings/core/TEST_STRING")
    assert response.status_code == 200
    data = response.json()
    assert data["key"] == "TEST_STRING"
    assert data["value"] == "test_value"


def test_get_core_setting_not_found(authenticated_client: TestClient):
    """
    Test retrieval of a non-existent setting.
    """
    response = authenticated_client.get("/api/v1/settings/core/NON_EXISTENT")
    assert response.status_code == 404


def test_update_core_setting(authenticated_client: TestClient, core_settings_data):
    """
    Test 1.11.4: Update Core Setting.
    """
    update_data = {"value": "new_value"}
    response = authenticated_client.put("/api/v1/settings/core/TEST_STRING", json=update_data)
    assert response.status_code == 200
    data = response.json()
    assert data["value"] == "new_value"

    # Verify persistence
    response = authenticated_client.get("/api/v1/settings/core/TEST_STRING")
    assert response.json()["value"] == "new_value"


def test_update_core_setting_not_found(authenticated_client: TestClient):
    """
    Test update of a non-existent setting.
    """
    update_data = {"value": "new_value"}
    response = authenticated_client.put("/api/v1/settings/core/NON_EXISTENT", json=update_data)
    assert response.status_code == 404


# --- RBAC Tests ---


def test_permissions_view_settings(client: TestClient, user_factory, core_settings_data):
    """
    Test 1.11.5: Permissions for viewing settings.
    """
    # User without permissions
    user_factory(login="no_perm_user", password="password")
    token_no_perm = client.post(
        "/api/v1/auth/login", json={"login": "no_perm_user", "password": "password"}
    ).json()["access_token"]

    client_no_perm = TestClient(client.app)
    client_no_perm.headers["Authorization"] = f"Bearer {token_no_perm}"

    response = client_no_perm.get("/api/v1/settings/core")
    assert response.status_code == 403

    # User with view permission
    user_factory(
        login="view_user",
        password="password",
        roles=[{"name": "viewer", "permissions": ["settings:view"]}],
    )
    token_view = client.post(
        "/api/v1/auth/login", json={"login": "view_user", "password": "password"}
    ).json()["access_token"]

    client_view = TestClient(client.app)
    client_view.headers["Authorization"] = f"Bearer {token_view}"

    response = client_view.get("/api/v1/settings/core")
    assert response.status_code == 200


def test_permissions_update_settings(client: TestClient, user_factory, core_settings_data):
    """
    Test 1.11.5: Permissions for updating settings.
    """
    # User with view permission only (cannot update)
    user_factory(
        login="viewer_comp",
        password="password",
        roles=[{"name": "viewer_c", "permissions": ["settings:view"]}],
    )
    token_view = client.post(
        "/api/v1/auth/login", json={"login": "viewer_comp", "password": "password"}
    ).json()["access_token"]

    client_view = TestClient(client.app)
    client_view.headers["Authorization"] = f"Bearer {token_view}"

    response = client_view.put("/api/v1/settings/core/TEST_STRING", json={"value": "hacked"})
    assert response.status_code == 403

    # User with update permission
    user_factory(
        login="updater",
        password="password",
        roles=[{"name": "updater", "permissions": ["settings:update"]}],
    )
    token_update = client.post(
        "/api/v1/auth/login", json={"login": "updater", "password": "password"}
    ).json()["access_token"]

    client_update = TestClient(client.app)
    client_update.headers["Authorization"] = f"Bearer {token_update}"

    response = client_update.put(
        "/api/v1/settings/core/TEST_STRING", json={"value": "legit_update"}
    )
    assert response.status_code == 200


# --- Service Tests ---


def test_service_get_core_setting_value(db_session: Session, core_settings_data):
    """
    Test 1.11.6: Service helper for type conversion.
    """
    # Test String
    val_str = services.get_core_setting_value(db_session, "TEST_STRING")
    assert val_str == "test_value"
    assert isinstance(val_str, str)

    # Test Int
    val_int = services.get_core_setting_value(db_session, "TEST_INT")
    assert val_int == 123
    assert isinstance(val_int, int)

    # Test Bool
    val_bool = services.get_core_setting_value(db_session, "TEST_BOOL")
    assert val_bool is True
    assert isinstance(val_bool, bool)

    # Test JSON
    val_json = services.get_core_setting_value(db_session, "TEST_JSON")
    assert val_json == {"foo": "bar"}
    assert isinstance(val_json, dict)


# --- Model Tests ---


def test_model_create(db_session: Session):
    """
    Test 1.11.7: CoreSetting model creation.
    """
    setting = CoreSetting(key="NEW_KEY", value="val", type="string")
    db_session.add(setting)
    db_session.commit()
    db_session.refresh(setting)
    assert setting.id is not None
    assert setting.is_sensitive is False  # Default
