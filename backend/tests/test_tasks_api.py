from unittest.mock import patch

import pytest
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core import task_collector
from app.core.task_contract import TaskDefinition
from app.tasks.models import ExecutionStatus, TaskExecution


class MockParams(BaseModel):
    param1: str


@pytest.fixture(autouse=True)
def mock_task_registry(monkeypatch):
    # Setup: Add a test task to the collector cache
    test_task = TaskDefinition(
        name="test_task",
        display_name="Test Task",
        category="system",
        params_schema=MockParams,
        permission="tasks:read",  # Using an existing permission that admin has
        secrets=["TEST_SECRET"],
    )

    # Mock collect_all_tasks and get_task_definition to return our test task
    def mock_collect():
        return [test_task]

    def mock_get(name):
        if name == "test_task":
            return test_task
        return None

    monkeypatch.setattr(task_collector, "collect_all_tasks", mock_collect)
    monkeypatch.setattr(task_collector, "get_task_definition", mock_get)
    yield


@pytest.fixture
def mock_worker_key(monkeypatch):
    from app.core.config import settings

    monkeypatch.setattr(settings, "CELERY_WORKER_API_KEY", "test_key")
    return {"X-API-Key": "test_key"}


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
            "/api/v1/tasks/test_task/run", json={"params": {"param1": "value1"}}
        )
        assert response.status_code == 202
        data = response.json()
        assert "execution_id" in data

        # Verify execution record in DB
        execution = (
            db_session.query(TaskExecution).filter(TaskExecution.id == data["execution_id"]).first()
        )
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
    response = authenticated_client.post("/api/v1/tasks/non_existent/run", json={"params": {}})
    assert response.status_code == 404


def test_run_task_validation_error(authenticated_client):
    response = authenticated_client.post(
        "/api/v1/tasks/test_task/run", json={"params": {"wrong_param": "value"}}
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
