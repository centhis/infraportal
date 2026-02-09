from app.core.config import Settings


def test_config_database_url_assembly(monkeypatch):
    """
    Test that DATABASE_URL is correctly assembled from POSTGRES components.
    """
    monkeypatch.delenv("DATABASE_URL", raising=False)
    settings = Settings(
        POSTGRES_USER="test_user",
        POSTGRES_PASSWORD="test_password",
        POSTGRES_HOST="test_host",
        POSTGRES_PORT=5432,
        POSTGRES_DB="test_db",
        CELERY_WORKER_API_KEY="test_key",  # Required field
    )

    expected_url = "postgresql+psycopg2://test_user:test_password@test_host:5432/test_db"
    assert settings.DATABASE_URL == expected_url


def test_config_database_url_priority():
    """
    Test that an explicit DATABASE_URL overrides the assembled one.
    """
    explicit_url = "postgresql+psycopg2://explicit:pass@host:5432/db"
    settings = Settings(
        POSTGRES_USER="ignore",
        POSTGRES_PASSWORD="ignore",
        POSTGRES_DB="ignore",
        DATABASE_URL=explicit_url,
        CELERY_WORKER_API_KEY="test_key",
    )

    assert settings.DATABASE_URL == explicit_url


def test_config_api_prefix_strip():
    """
    Test that API_PREFIX is stripped of whitespace.
    """
    settings = Settings(
        POSTGRES_USER="u",
        POSTGRES_PASSWORD="p",
        POSTGRES_DB="d",
        API_PREFIX=" /api/v2 ",
        CELERY_WORKER_API_KEY="k",
    )
    assert settings.API_PREFIX == "/api/v2"


def test_config_allowed_origins_parsing():
    """
    Test that ALLOWED_ORIGINS string is parsed into a list.
    """
    settings = Settings(
        POSTGRES_USER="u",
        POSTGRES_PASSWORD="p",
        POSTGRES_DB="d",
        ALLOWED_ORIGINS=" http://localhost:3000, https://example.com ",
        CELERY_WORKER_API_KEY="k",
    )
    assert settings.ALLOWED_ORIGINS == ["http://localhost:3000", "https://example.com"]
