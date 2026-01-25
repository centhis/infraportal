
import pytest
from app.core.config import settings
from app.users.models import User
from sqlalchemy.orm import Session

@pytest.fixture
def internal_client(client):
    client.headers["X-API-Key"] = settings.CELERY_WORKER_API_KEY
    return client

def test_sync_ldap_users_internal_success(internal_client, db_session: Session):
    users_payload = [
        {
            "ldap_id": "internal-uuid-1",
            "login": "internal_user1",
            "full_name": "Internal User 1",
            "ldap_dn": "cn=u1,dc=ex",
            "is_active": True
        },
        {
            "ldap_id": "internal-uuid-2",
            "login": "internal_user2",
            "full_name": "Internal User 2",
            "ldap_dn": "cn=u2,dc=ex",
            "is_active": False
        }
    ]
    
    response = internal_client.post(
        "/api/internal/users/sync_ldap",
        json=users_payload
    )
    assert response.status_code == 200
    stats = response.json()
    assert stats["created"] == 2
    assert stats["updated"] == 0
    assert stats["errors"] == 0
    
    # Verify in DB
    u1 = db_session.query(User).filter(User.ldap_id == "internal-uuid-1").first()
    assert u1 is not None
    assert u1.login == "internal_user1"
    assert u1.is_active is True
    
    u2 = db_session.query(User).filter(User.ldap_id == "internal-uuid-2").first()
    assert u2.is_active is False

def test_sync_ldap_users_internal_unauthorized(client):
    response = client.post("/api/internal/users/sync_ldap", json=[])
    assert response.status_code == 401
