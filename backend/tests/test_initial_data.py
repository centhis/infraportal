from sqlalchemy.orm import Session
import pytest

from app.users.initial_data import init_data
from app.users.models import User, Group, Role, Permission
from app.core.config import settings

def test_initial_data_idempotency_and_correctness(db_session: Session):
    """
    Test the idempotency and correctness of initial data loading.
    Initial data is loaded once by the run_migrations fixture.
    This test calls it again to ensure idempotency and verifies the data.
    """
    # Call init_data again to test idempotency
    init_data(db_session)

    # --- Verify Admin User ---
    admin_user = db_session.query(User).filter(User.login == settings.DEFAULT_ADMIN_USER).first()
    assert admin_user is not None
    assert admin_user.login == settings.DEFAULT_ADMIN_USER
    assert admin_user.type == "built_in"
    assert admin_user.is_active is True

    # --- Verify Default Groups ---
    admins_group = db_session.query(Group).filter(Group.name == "admins").first()
    assert admins_group is not None
    assert admins_group.built_in is True

    # Verify admin user is in 'admins' group
    assert admins_group in admin_user.groups

    # --- Verify Default Roles ---
    admin_role = db_session.query(Role).filter(Role.name == "admin").first()
    assert admin_role is not None
    assert admin_role.built_in is True
    
    # Verify 'admins' group has 'admin' role
    assert admin_role in admins_group.roles

    # --- Verify Default Permissions (spot check a few) ---
    permissions_created_in_initial_data = [
        "users:view", "users:create", "users:update", "users:delete",
    ]

    for perm_name in permissions_created_in_initial_data:
        permission = db_session.query(Permission).filter(Permission.name == perm_name).first()
        assert permission is not None
        assert permission.built_in is True

    # Verify some permissions are assigned to the 'admin' role
    admin_role_permissions = [p.name for p in admin_role.permissions]
    for perm_name in ["users:view", "users:create"]: # Check a couple of specific ones that are created and assigned
        assert perm_name in admin_role_permissions

    # --- Verify no duplicates created (check counts after second init_data call) ---
    assert db_session.query(User).filter(User.login == settings.DEFAULT_ADMIN_USER).count() == 1
    assert db_session.query(Group).filter(Group.name == "admins").count() == 1
    assert db_session.query(Role).filter(Role.name == "admin").count() == 1
    assert db_session.query(Permission).filter(Permission.name == "users:view").count() == 1
