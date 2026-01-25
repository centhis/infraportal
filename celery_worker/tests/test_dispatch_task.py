import pytest
from unittest.mock import patch, MagicMock
from tasks import dispatch_task
from task_registry import register_task_handler
import httpx

@pytest.fixture
def mock_handler():
    handler = MagicMock(return_value="success")
    register_task_handler("my_task", handler)
    return handler

def test_dispatch_direct_success(mock_handler):
    """Test successful dispatch with execution_id provided directly."""
    result = dispatch_task(task_type="my_task", execution_id="exec-123", param1="val1")
    
    assert result == "success"
    mock_handler.assert_called_once_with(execution_id="exec-123", secrets={}, param1="val1")

@patch("httpx.post")
def test_dispatch_scheduled_success(mock_post, mock_handler):
    """Test successful dispatch with schedule_id (requires backend call)."""
    # 1. Mock response for execution_id request
    mock_resp_exec = MagicMock()
    mock_resp_exec.status_code = 200
    mock_resp_exec.json.return_value = {
        "execution_id": "exec-456",
        "task_type": "my_task",
        "params": {"p2": "v2"}
    }
    
    # 2. Mock response for secrets request
    mock_resp_secrets = MagicMock()
    mock_resp_secrets.status_code = 200
    mock_resp_secrets.json.return_value = {"secrets": {"api_key": "secret"}}
    
    mock_post.side_effects = [mock_resp_exec, mock_resp_secrets]
    # In newer httpx mock side_effect is used differently, but let's use a simpler way
    def side_effect(url, **kwargs):
        if "/task_execution" in url:
            return mock_resp_exec
        if "/secrets" in url:
            return mock_resp_secrets
        return MagicMock(status_code=404)
    
    mock_post.side_effect = side_effect

    result = dispatch_task(task_type="ignored", schedule_id="sched-001")
    
    assert result == "success"
    mock_handler.assert_called_once_with(execution_id="exec-456", secrets={"api_key": "secret"}, p2="v2")

@patch("httpx.post")
def test_dispatch_backend_error(mock_post):
    """Test behavior when backend returned error for schedule_id."""
    mock_resp = MagicMock()
    mock_resp.status_code = 404
    mock_resp.text = "Not found"
    mock_resp.raise_for_status.side_effect = httpx.HTTPStatusError("Err", request=MagicMock(), response=mock_resp)
    mock_post.return_value = mock_resp
    
    with pytest.raises(ValueError, match="Failed to get execution_id from backend"):
        dispatch_task(task_type="my_task", schedule_id="sched-999")

def test_dispatch_handler_not_found():
    """Test error when handler is missing."""
    with pytest.raises(ValueError, match="Handler for task_type 'missing' not found"):
        dispatch_task(task_type="missing", execution_id="123")

def test_dispatch_handler_exception(mock_handler):
    """Test behavior when handler itself throws an exception."""
    mock_handler.side_effect = Exception("Logic failed")
    
    with pytest.raises(Exception, match="Logic failed"):
        dispatch_task(task_type="my_task", execution_id="123")
