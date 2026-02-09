import pytest
from unittest.mock import patch, MagicMock
from tasks import dispatch_task
from task_registry import register_task_handler
import httpx

@pytest.fixture
def mock_handler():
    handler = MagicMock(return_value={"result": "data"})
    register_task_handler("my_task", handler)
    return handler

@pytest.fixture(autouse=True)
def mock_httpx(monkeypatch):
    mock_post = MagicMock()
    mock_patch = MagicMock()
    
    # Common success response
    mock_ok = MagicMock()
    mock_ok.status_code = 200
    mock_ok.json.return_value = {"status": "ok"}
    
    mock_post.return_value = mock_ok
    mock_patch.return_value = mock_ok
    
    monkeypatch.setattr("httpx.post", mock_post)
    monkeypatch.setattr("httpx.patch", mock_patch)
    
    return {"post": mock_post, "patch": mock_patch}

def test_dispatch_direct_success(mock_httpx, mock_handler):
    """Test successful dispatch with execution_id provided directly."""
    result = dispatch_task(task_type="my_task", execution_id="exec-123", param1="val1")
    
    assert result == {"result": "data"}
    mock_handler.assert_called_once_with(execution_id="exec-123", secrets={}, param1="val1")
    
    # Should call status update (IN_PROGRESS)
    mock_httpx["patch"].assert_called()
    # Should call result sending
    mock_httpx["post"].assert_called_with(
        "http://test-backend/tasks/exec-123/result",
        json={"result": "data"},
        headers={"X-API-Key": "test-api-key"},
        timeout=30.0
    )

def test_dispatch_scheduled_success(mock_httpx, mock_handler):
    """Test successful dispatch with schedule_id (requires backend call)."""
    # Mock sequence: task_execution, secrets, result
    resp_exec = MagicMock(status_code=200)
    resp_exec.json.return_value = {
        "execution_id": "exec-456",
        "task_type": "my_task",
        "params": {"p2": "v2"}
    }
    
    resp_secrets = MagicMock(status_code=200)
    resp_secrets.json.return_value = {"secrets": {"api_key": "secret"}}
    
    resp_ok = MagicMock(status_code=200)
    
    mock_httpx["post"].side_effect = [resp_exec, resp_secrets, resp_ok]

    result = dispatch_task(task_type="ignored", schedule_id="sched-001")
    
    assert result == {"result": "data"}
    mock_handler.assert_called_once_with(execution_id="exec-456", secrets={"api_key": "secret"}, p2="v2")
    
    # Verify result was sent to correct ID
    # call_args_list may vary if there were other calls, but result is usually the last POST
    # Actually, post is called for task_execution, secrets, AND result.
    last_call = mock_httpx["post"].call_args_list[-1]
    assert last_call.args[0] == "http://test-backend/tasks/exec-456/result"

def test_dispatch_backend_error(mock_httpx):
    """Test behavior when backend returned error for schedule_id."""
    mock_resp = MagicMock(status_code=404, text="Not found")
    mock_resp.raise_for_status.side_effect = httpx.HTTPStatusError("Err", request=MagicMock(), response=mock_resp)
    mock_httpx["post"].return_value = mock_resp
    
    with pytest.raises(ValueError, match="Failed to get execution_id from backend"):
        dispatch_task(task_type="my_task", schedule_id="sched-999")

def test_dispatch_handler_not_found(mock_httpx):
    """Test error when handler is missing."""
    with pytest.raises(ValueError, match="Handler for task_type 'missing' not found"):
        dispatch_task(task_type="missing", execution_id="123")
    
    # Should mark as FAILURE in backend
    mock_httpx["patch"].assert_called_with(
        "http://test-backend/tasks/123",
        json={"status": "FAILURE", "result": {"error": "Handler for task_type 'missing' not found."}},
        headers={"X-API-Key": "test-api-key"},
        timeout=5.0
    )

def test_dispatch_handler_exception(mock_httpx, mock_handler):
    """Test behavior when handler itself throws an exception."""
    mock_handler.side_effect = Exception("Logic failed")
    
    with pytest.raises(Exception, match="Logic failed"):
        dispatch_task(task_type="my_task", execution_id="123")
    
    # Should mark as FAILURE in backend
    mock_httpx["patch"].assert_called_with(
        "http://test-backend/tasks/123",
        json={"status": "FAILURE", "result": {"error": "Logic failed"}},
        headers={"X-API-Key": "test-api-key"},
        timeout=5.0
    )
