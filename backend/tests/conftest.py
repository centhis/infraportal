import pytest
from fastapi.testclient import TestClient
import subprocess
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from main import app
from app.db.database import get_db
from app.core.config import settings
from app.users.local.services import UserService
from app.users.local.schemas import CreateUserSchema
from app.users.models import Group


@pytest.fixture(scope="session", autouse=True)
def run_migrations():
    """
    Apply alembic migrations to the test database before the test session starts.
    """
    try:
        subprocess.run(["alembic", "upgrade", "head"], check=True, capture_output=True, text=True)
    except subprocess.CalledProcessError as e:
        print("Alembic migration failed:")
        print(e.stdout)
        print(e.stderr)
        raise
    yield
    # Optional: downgrade to base after tests
    # subprocess.run(["alembic", "downgrade", "base"], check=True)

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


@pytest.fixture
def client(run_migrations, db_session):
    """
    Pytest fixture to provide a TestClient with an overridden database dependency.
    """
    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    
    with TestClient(app) as c:
        yield c

    # Clean up dependency overrides
    app.dependency_overrides = {}

@pytest.fixture
def authenticated_client(client: TestClient):
    """
    Pytest fixture to provide an authenticated TestClient.
    """
    login_response = client.post(
        "/api/v1/auth/login",
        json={"login": settings.DEFAULT_ADMIN_USER, "password": settings.DEFAULT_ADMIN_PASSWORD}
    )
    access_token = login_response.json()["access_token"]
    client.headers["Authorization"] = f"Bearer {access_token}"
    return client

@pytest.fixture
def tmp_user(db_session):
    """
    Create a temporary user for testing and assign it to the 'admins' group.
    """
    user_schema = CreateUserSchema(login="testuser", password="password", name="Test User")
    user_service = UserService(db_session)
    user = user_service.create_user(user_schema)
    
    admins_group = db_session.query(Group).filter(Group.name == "admins").first()
    user.groups.append(admins_group)
    db_session.commit()
    
    return user
