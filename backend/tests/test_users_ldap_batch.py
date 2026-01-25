
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.users.ldap.services import create_or_update_ldap_user, sync_ldap_users_batch
from app.users.models import User

# Helper to clear users safely
def clear_users(db: Session):
    # Depending on your models, you might need to clear association tables first
    # Or just delete specific test users.
    # Here we try to clear everything but need raw SQL or cascade knowledge
    # Safer: just delete the specific user created in test or handle FKs
    
    # Raw SQL is often easiest for full cleanup if we don't have cascade setup perfectly in tests
    # Deleting users usually requires deleting user_groups first
    db.execute(text("DELETE FROM user_group_association"))
    db.execute(text("DELETE FROM users WHERE login != 'admin'")) # Preserve admin if needed, or just nuke all non-system
    db.commit()

def test_create_new_ldap_user(db_session: Session):
    user_info = {
         "ldap_id": "test-uuid",
         "login": "testuser",
         "full_name": "Test User",

         "dn": "cn=test,dc=example",
         "is_active": True
    }
    
    # Clean
    clear_users(db_session)
    
    user = create_or_update_ldap_user(db_session, user_info)
    # The service might commit, but if not we do
    db_session.commit()
    
    assert user is not None
    assert user.login == "testuser"
    assert user.ldap_id == "test-uuid"
    assert user.type == "ldap"

def test_update_existing_ldap_user(db_session: Session):
    # Clean
    clear_users(db_session)
    
    # Setup existing user
    u = User(login="existing", ldap_id="old-id", type="ldap", name="Old Name")
    db_session.add(u)
    db_session.commit()
    
    user_info = {
        "ldap_id": "old-id", # Match by ID
        "login": "existing",
        "full_name": "New Name", # Changed

    }
    
    updated_user = create_or_update_ldap_user(db_session, user_info)
    db_session.commit()
    
    assert updated_user.id == u.id
    assert updated_user.name == "New Name"


def test_sync_ldap_users_batch_optimised(db_session: Session):
    clear_users(db_session)
    
    users_data = [
        {"ldap_id": "u1", "login": "user1", "full_name": "User 1"},
        {"ldap_id": "u2", "login": "user2", "full_name": "User 2"}
    ]
    
    stats = sync_ldap_users_batch(db_session, users_data)
    
    assert stats["created"] == 2
    assert stats["updated"] == 0
    assert stats["errors"] == 0
    
    # Second run (should update)
    stats2 = sync_ldap_users_batch(db_session, users_data)
    assert stats2["created"] == 0
    assert stats2["updated"] == 2
