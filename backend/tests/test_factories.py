import pytest
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException

def test_tmp_group_duplicate_name_raises_error(tmp_group, db_session):
    """
    Test that tmp_group raises an IntegrityError when trying to create a group
    with a name that already exists.
    """
    group_name = "duplicate_group_test"
    tmp_group(name=group_name)  # First creation should succeed

    with pytest.raises(IntegrityError):
        tmp_group(name=group_name)  # Second creation with same name should fail

    db_session.rollback() # Rollback the session to clear the failed transaction

def test_tmp_role_duplicate_name_raises_error(tmp_role, db_session):
    """
    Test that tmp_role raises an IntegrityError when trying to create a role
    with a name that already exists.
    """
    role_name = "duplicate_role_test"
    tmp_role(name=role_name)  # First creation should succeed

    with pytest.raises(IntegrityError):
        tmp_role(name=role_name)  # Second creation with same name should fail

    db_session.rollback() # Rollback the session to clear the failed transaction

def test_tmp_permission_duplicate_name_returns_existing(tmp_permission, db_session):
    """
    Test that tmp_permission returns the existing permission if a permission
    with the given name already exists, instead of raising an error.
    """
    permission_name = "duplicate_permission_test"
    
    # First creation should succeed and return the new permission
    first_permission = tmp_permission(name=permission_name)
    assert first_permission.name == permission_name

    # Second creation with the same name should return the existing permission
    second_permission = tmp_permission(name=permission_name)
    assert second_permission.id == first_permission.id
    assert second_permission.name == first_permission.name

    db_session.rollback() # Rollback the session to clear the transaction

def test_user_factory_duplicate_login_raises_error(user_factory, db_session):
    """
    Test that user_factory raises an HTTPException when trying to create a user
    with a login that already exists.
    """
    user_login = "duplicate_user_test"
    user_factory(login=user_login, password="password")  # First creation should succeed

    with pytest.raises(HTTPException) as excinfo:
        user_factory(login=user_login, password="password")  # Second creation with same login should fail
    
    assert excinfo.value.status_code == 400
    assert "User already exists" in excinfo.value.detail

    db_session.rollback() # Rollback the session to clear the failed transaction