
import pytest
from unittest.mock import patch
from app.tasks.registry import TASK_REGISTRY, TaskDefinition
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.tasks.models import TaskExecution, ExecutionStatus

class MockParams(BaseModel):
    param1: str

@pytest.fixture(autouse=True)
def mock_task_registry():
    # Setup: Add a test task to the global registry
    test_task = TaskDefinition(
        name="test_task",
        params_schema=MockParams,
        permission="tasks:read" # Using an existing permission that admin has
    )
    TASK_REGISTRY["test_task"] = test_task
    yield
    # Cleanup: Remove the test task
    if "test_task" in TASK_REGISTRY:
        del TASK_REGISTRY["test_task"]

def test_get_available_tasks(authenticated_client):
    response = authenticated_client.get("/api/v1/tasks")
    assert response.status_code == 200
    data = response.json()
    assert "test_task" in data
    assert data["test_task"]["name"] == "test_task"
    assert "params_schema" in data["test_task"]

def test_run_task_success(authenticated_client, db_session: Session):
    with patch("app.tasks.services.celery_client.send_task") as mock_send:
        response = authenticated_client.post(
            "/api/v1/tasks/test_task/run",
            json={"params": {"param1": "value1"}}
        )
        assert response.status_code == 202
        data = response.json()
        assert "execution_id" in data
        
        # Verify execution record in DB
        execution = db_session.query(TaskExecution).filter(TaskExecution.id == data["execution_id"]).first()
        assert execution is not None
        assert execution.task_type == "test_task"
        assert execution.status == ExecutionStatus.PENDING
        
        mock_send.assert_called_once()
        args, kwargs = mock_send.call_args
        assert args[0] == "tasks.dispatch"
        assert kwargs["kwargs"]["task_type"] == "test_task"
        assert kwargs["kwargs"]["execution_id"] == data["execution_id"]
        assert kwargs["kwargs"]["param1"] == "value1"

def test_run_task_not_found(authenticated_client):
    response = authenticated_client.post(
        "/api/v1/tasks/non_existent/run",
        json={"params": {}}
    )
    assert response.status_code == 404

def test_run_task_validation_error(authenticated_client):
    response = authenticated_client.post(
        "/api/v1/tasks/test_task/run",
        json={"params": {"wrong_param": "value"}}
    )
    assert response.status_code == 422

def test_list_task_executions(authenticated_client, db_session: Session):
    # Setup: Create some executions
    ex1 = TaskExecution(task_type="t1", status=ExecutionStatus.SUCCESS, triggered_by="test")
    ex2 = TaskExecution(task_type="t2", status=ExecutionStatus.PENDING, triggered_by="test")
    db_session.add_all([ex1, ex2])
    db_session.commit()
    
    response = authenticated_client.get("/api/v1/task_executions")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 2
    
def test_get_task_execution_detail(authenticated_client, db_session: Session):
    ex = TaskExecution(task_type="detail_test", status=ExecutionStatus.PENDING, triggered_by="test")
    db_session.add(ex)
    db_session.commit()
    db_session.refresh(ex)
    
    response = authenticated_client.get(f"/api/v1/task_executions/{ex.id}")
    assert response.status_code == 200
    assert response.json()["task_type"] == "detail_test"

def test_get_task_execution_not_found(authenticated_client):
    import uuid
    random_id = uuid.uuid4()
    response = authenticated_client.get(f"/api/v1/task_executions/{random_id}")
    assert response.status_code == 404
