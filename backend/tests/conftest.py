import pytest
from fastapi.testclient import TestClient
import subprocess
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from datetime import datetime, timedelta, timezone

from main import app
from app.db.database import get_db
from app.core.config import settings
from app.core.security import create_token, REFRESH_TOKEN_EXPIRE, ACCESS_TOKEN_EXPIRE
from app.users.local.services import UserService
from app.users.local.schemas import CreateUserSchema
from app.users.models import Group, User, Role, Permission


@pytest.fixture(scope="session", autouse=True)
def run_migrations(db_engine): # Add db_engine as a dependency
    """
    Apply alembic migrations to the test database and initialize data before the test session starts.
    """
    try:
        # Note: We are in the 'backend' directory when running pytest
        subprocess.run(["./.venv/bin/alembic", "upgrade", "head"], check=True, capture_output=True, text=True)
        
        # Initialize default data (admin user, roles, permissions)
        # Use a session to call init_data
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=db_engine)
        db = SessionLocal()
        try:
            from app.users.initial_data import init_data
            init_data(db)
        finally:
            db.close()

    except subprocess.CalledProcessError as e:
        print("Alembic migration failed:")
        print(e.stdout)
        print(e.stderr)
        raise
    yield
    # Optional: downgrade to base after tests
    # subprocess.run(["./.venv/bin/alembic", "downgrade", "base"], check=True)

@pytest.fixture(scope="session")
def db_engine():
    engine = create_engine(settings.DATABASE_URL)
    yield engine
    engine.dispose()

@pytest.fixture(scope="function")
def db_session(db_engine):
    connection = db_engine.connect()
    transaction = connection.begin()
    session = sessionmaker(autocommit=False, autoflush=False, bind=connection)()
    yield session
    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture(scope="function")
def test_app_client_factory(run_migrations, db_session):
    """
    Factory fixture to create TestClient instances with an overridden database dependency.
    """
    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    
    # This factory will return a TestClient
    def _test_client_factory():
        return TestClient(app)

    yield _test_client_factory

    # Clean up dependency overrides
    app.dependency_overrides = {}

@pytest.fixture
def client(test_app_client_factory):
    """
    Provides a default TestClient.
    """
    return test_app_client_factory()

@pytest.fixture
def authenticated_client(test_app_client_factory): # Use the factory
    """
    Pytest fixture to provide an authenticated TestClient for the admin user.
    """
    client = test_app_client_factory() # Get a fresh client
    login_response = client.post(
        "/api/v1/auth/login",
        json={"login": settings.DEFAULT_ADMIN_USER, "password": settings.DEFAULT_ADMIN_PASSWORD}
    )
    access_token = login_response.json()["access_token"]
    client.headers["Authorization"] = f"Bearer {access_token}"
    return client

@pytest.fixture
def non_admin_client(test_app_client_factory, user_factory): # Use the factory
    """
    Pytest fixture to provide an authenticated TestClient for a non-admin user.
    """
    client = test_app_client_factory() # Get a fresh client
    user = user_factory("regular_user_rbac", "password_rbac")
    login_response = client.post("/api/v1/auth/login", json={"login": "regular_user_rbac", "password": "password_rbac"})
    access_token = login_response.json()["access_token"]
    client.headers["Authorization"] = f"Bearer {access_token}"
    return client



@pytest.fixture
def token_factory():
    """
    Fixture to create access and refresh tokens with custom expiration times.
    """
    def _token_factory(
        user_id: int,
        permissions: list[str],
        token_type: str = "access",
        expires_delta: timedelta | None = None
    ):
        if token_type == "access":
            if expires_delta is None:
                expires_delta = timedelta(minutes=ACCESS_TOKEN_EXPIRE)
        elif token_type == "refresh":
            if expires_delta is None:
                expires_delta = timedelta(minutes=REFRESH_TOKEN_EXPIRE)
        else:
            raise ValueError("token_type must be 'access' or 'refresh'")

        # The 'exp' claim is added by create_token itself, no need to add here
        to_encode = {"sub": str(user_id), "permissions": permissions}
        
        # Pass expires_delta and token_type directly to create_token
        return create_token(to_encode, expires_delta, token_type)
    return _token_factory

@pytest.fixture
def tmp_group(db_session):
    """
    Fixture to create a temporary group for testing.
    """
    def _tmp_group(name: str = "test_group", description: str = "A temporary group"):
        group = Group(name=name, description=description)
        db_session.add(group)
        db_session.commit()
        db_session.refresh(group)
        return group
    return _tmp_group

@pytest.fixture
def tmp_role(db_session, tmp_permission):
    """
    Fixture to create a temporary role for testing.
    Can optionally assign permissions to the role.
    """
    def _tmp_role(name: str = "test_role", description: str = "A temporary role", permissions: list[str] = None):
        role = Role(name=name, description=description)
        db_session.add(role)
        db_session.commit()
        db_session.refresh(role)

        if permissions:
            for perm_name in permissions:
                permission = db_session.query(Permission).filter(Permission.name == perm_name).first()
                if not permission:
                    permission = tmp_permission(name=perm_name) # Create if not exists
                role.permissions.append(permission)
            db_session.commit()
            db_session.refresh(role)
        return role
    return _tmp_role

@pytest.fixture
def tmp_permission(db_session):
    """
    Fixture to create a temporary permission for testing.
    If a permission with the given name already exists, it returns the existing one.
    """
    def _tmp_permission(name: str = "test:permission", description: str = "A temporary permission"):
        permission = db_session.query(Permission).filter(Permission.name == name).first()
        if permission:
            return permission
        
        permission = Permission(name=name, description=description)
        db_session.add(permission)
        db_session.commit()
        db_session.refresh(permission)
        return permission
    return _tmp_permission

@pytest.fixture
def tmp_user(db_session):
    """
    Create a temporary user for testing and assign it to the 'admins' group.
    """
    user_schema = CreateUserSchema(login="testuser", password="password", name="Test User")
    user_service = UserService(db_session)
    
    # create_user returns a Pydantic schema, not the SQLAlchemy model
    created_user_schema = user_service.create_user(user_schema)
    
    # Fetch the SQLAlchemy model instance from the database
    user = db_session.query(User).filter(User.id == created_user_schema.id).first()
    
    admins_group = db_session.query(Group).filter(Group.name == "admins").first()
    if admins_group:
        user.groups.append(admins_group)
        db_session.commit()
        db_session.refresh(user)
    
    return user

@pytest.fixture
def user_factory(db_session, tmp_group, tmp_role, tmp_permission): # Added tmp_permission
    """
    Fixture to create users with specified groups and roles.
    Roles are assigned to the user via a new temporary group created for the user.
    """
    def _user_factory(
        login: str,
        password: str,
        name: str = "Test User",
        groups: list[str] = None,
        roles: list[dict] = None, # Expects a list of dicts: [{"name": "role1", "permissions": ["perm1"]}]
    ):
        user_schema = CreateUserSchema(login=login, password=password, name=name)
        user_service = UserService(db_session)
        created_user_schema = user_service.create_user(user_schema)
        user = db_session.query(User).filter(User.id == created_user_schema.id).first()

        # Handle groups for the user
        user_groups = []
        if groups:
            for group_name in groups:
                group = db_session.query(Group).filter(Group.name == group_name).first()
                if not group:
                    group = tmp_group(name=group_name) # Create if not exists
                user_groups.append(group)
        
        # If roles are provided, create a dedicated group for these roles and assign to user
        # or if no specific groups were passed in
        if roles:
            # Create a dedicated group for this user's roles if not already assigned to one
            # or if no specific groups were passed in
            if not user_groups: # If user is not already assigned to any group, create one
                roles_group_name = f"{login}_roles_group"
                roles_group = db_session.query(Group).filter(Group.name == roles_group_name).first()
                if not roles_group:
                    roles_group = tmp_group(name=roles_group_name, description=f"Roles group for {login}")
                user_groups.append(roles_group)
            
            # Assign roles to the *first* group in user_groups or the newly created roles_group
            target_group = user_groups[0] # Assign roles to the primary group

            for role_data in roles:
                role_name = role_data["name"]
                role_permissions = role_data.get("permissions", [])
                
                # Fetch or create the role
                role = db_session.query(Role).filter(Role.name == role_name).first()
                if not role:
                    role = tmp_role(name=role_name, permissions=role_permissions)
                else:
                    # If role exists, ensure its permissions are updated (only for tmp_role creation)
                    # This part is handled by tmp_role itself. No need to duplicate logic here.
                    pass 
                
                # Assign role to the target group
                if role not in target_group.roles:
                    target_group.roles.append(role)
                    
        # Assign all collected groups to the user
        for group in user_groups:
            if group not in user.groups:
                user.groups.append(group)

        db_session.commit()
        db_session.refresh(user)
        return user
    return _user_factory


