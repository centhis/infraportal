import pytest
import sys
from pathlib import Path

# Add worker root to sys.path
worker_root = Path(__file__).parent.parent
sys.path.insert(0, str(worker_root))

@pytest.fixture(autouse=True)
def mock_settings(monkeypatch):
    """Override settings for tests."""
    monkeypatch.setattr("config.settings.BACKEND_INTERNAL_API_URL", "http://test-backend")
    monkeypatch.setattr("config.settings.CELERY_WORKER_API_KEY", "test-api-key")

@pytest.fixture(autouse=True)
def clear_registry():
    """Clear task registry before each test."""
    from task_registry import _task_handlers
    _task_handlers.clear()
    yield
    _task_handlers.clear()
