
import pytest
from unittest.mock import MagicMock, patch
from handlers.tasks.cleanup import cleanup_zombie_tasks
import httpx

@pytest.fixture
def mock_httpx(monkeypatch):
    mock_get = MagicMock()
    monkeypatch.setattr("httpx.get", mock_get)
    return mock_get

@pytest.fixture
def mock_celery(monkeypatch):
    mock_app = MagicMock()
    mock_control = MagicMock()
    mock_inspect = MagicMock()
    
    mock_control.inspect.return_value = mock_inspect
    mock_app.control = mock_control
    
    monkeypatch.setattr("handlers.tasks.cleanup.celery_app", mock_app)
    return {"app": mock_app, "inspect": mock_inspect, "control": mock_control}

@pytest.fixture
def mock_settings(monkeypatch):
    mock_settings = MagicMock()
    mock_settings.BACKEND_INTERNAL_API_URL = "http://backend:8000/api/internal"
    mock_settings.CELERY_WORKER_API_KEY = "worker_key"
    monkeypatch.setattr("handlers.tasks.cleanup.settings", mock_settings)
    return mock_settings

def test_cleanup_no_stale_tasks(mock_httpx, mock_celery, mock_settings):
    """Тест: бэкенд не возвращает зависших задач."""
    mock_resp = MagicMock(status_code=200)
    mock_resp.json.return_value = []
    mock_httpx.return_value = mock_resp

    result = cleanup_zombie_tasks("exec-1")
    
    assert result == {"terminated_ids": []}
    mock_httpx.assert_called_with(
        "http://backend:8000/api/internal/tasks/stale",
        params={"timeout_seconds": 300},
        headers={"X-API-Key": "worker_key"},
        timeout=10.0
    )
    # Should not inspect celery if no stale tasks
    mock_celery["app"].control.inspect.assert_not_called()

def test_cleanup_terminates_active_tasks(mock_httpx, mock_celery, mock_settings):
    """Тест: завершение задач, активных в Celery."""
    # Backend returns 2 stale tasks
    stale_ids = ["task-1", "task-2"]
    mock_resp = MagicMock(status_code=200)
    mock_resp.json.return_value = stale_ids
    mock_httpx.return_value = mock_resp

    # Celery inspector says "task-1" is running
    mock_celery["inspect"].active.return_value = {
        "worker1": [
            {"id": "celery-id-1", "kwargs": {"execution_id": "task-1"}},
            {"id": "celery-id-other", "kwargs": {"execution_id": "other"}}
        ]
    }

    result = cleanup_zombie_tasks("exec-1")

    assert result == {"terminated_ids": ["task-1", "task-2"]}
    
    # Check revoke called for task-1
    mock_celery["control"].revoke.assert_called_once_with("celery-id-1", terminate=True)

def test_cleanup_ignores_inactive_tasks(mock_httpx, mock_celery, mock_settings):
    """Тест: задачи, отсутствующие в Celery, просто возвращаются в списке."""
    stale_ids = ["task-3"]
    mock_resp = MagicMock(status_code=200)
    mock_resp.json.return_value = stale_ids
    mock_httpx.return_value = mock_resp

    # Celery has no active tasks
    mock_celery["inspect"].active.return_value = {}

    result = cleanup_zombie_tasks("exec-1")

    assert result == {"terminated_ids": ["task-3"]}
    mock_celery["control"].revoke.assert_not_called()

def test_cleanup_backend_error(mock_httpx, mock_settings):
    """Тест: обработка ошибки при запросе к бэкенду."""
    mock_resp = MagicMock(status_code=500)
    mock_resp.raise_for_status.side_effect = httpx.HTTPStatusError("Err", request=None, response=mock_resp)
    mock_httpx.return_value = mock_resp

    with pytest.raises(httpx.HTTPStatusError):
        cleanup_zombie_tasks("exec-1")
