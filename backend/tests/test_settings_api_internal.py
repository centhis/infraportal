import pytest
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import encrypt_value
from app.settings.ldap.models import LdapSetting
from app.settings.models import TaskSecretMapping


@pytest.fixture
def internal_client(client):
    client.headers["X-API-Key"] = settings.CELERY_WORKER_API_KEY
    return client


def test_get_task_secret_success(internal_client, db_session: Session):
    # Setup: Create a setting and a mapping
    encrypted_pass = encrypt_value("top_secret")
    setting = LdapSetting(
        key="LDAP_BIND_PASSWORD", value=encrypted_pass, type="string", is_sensitive=True
    )

    mapping = TaskSecretMapping(
        task_type="users:sync_ldap", setting_key="LdapSetting:LDAP_BIND_PASSWORD"
    )
    db_session.add_all([setting, mapping])
    db_session.commit()

    response = internal_client.post(
        "/api/internal/settings/secrets", json={"task_type": "users:sync_ldap"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "secrets" in data
    assert data["secrets"]["LDAP_BIND_PASSWORD"] == "top_secret"


def test_get_task_secret_forbidden(internal_client, db_session: Session):
    # No mapping for this task type
    response = internal_client.post(
        "/api/internal/settings/secrets", json={"task_type": "unauthorized_task"}
    )
    assert response.status_code == 403


def test_get_task_secret_not_found(internal_client, db_session: Session):
    # Mapping exists but setting value is None
    mapping = TaskSecretMapping(task_type="empty_task", setting_key="LdapSetting:MISSING_KEY")
    db_session.add(mapping)
    db_session.commit()

    response = internal_client.post(
        "/api/internal/settings/secrets", json={"task_type": "empty_task"}
    )
    assert response.status_code == 404


def test_internal_settings_unauthorized(client):
    response = client.post("/api/internal/settings/secrets", json={"task_type": "any"})
    assert response.status_code == 401
