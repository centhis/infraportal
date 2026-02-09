from datetime import datetime, timedelta
from unittest.mock import patch

import pytest
import pytz
from sqlalchemy.orm import Session

from app.core.config import settings
from app.tasks.models import ExecutionStatus, PeriodicTask, TaskDefinitionModel, TaskExecution


@pytest.fixture
def internal_client(client):
    client.headers["X-API-Key"] = settings.CELERY_WORKER_API_KEY
    return client


def test_update_task_status(internal_client, db_session: Session):
    ex = TaskExecution(task_type="test", status=ExecutionStatus.PENDING, triggered_by="test")
    db_session.add(ex)
    db_session.commit()
    db_session.refresh(ex)

    response = internal_client.patch(
        f"/api/internal/tasks/{ex.id}", json={"status": "SUCCESS", "result": {"foo": "bar"}}
    )
    assert response.status_code == 200

    db_session.refresh(ex)
    assert ex.status == ExecutionStatus.SUCCESS
    assert ex.result == {"foo": "bar"}
    assert ex.finished_at is not None


def test_update_task_heartbeat(internal_client, db_session: Session):
    ex = TaskExecution(task_type="test", status=ExecutionStatus.PENDING, triggered_by="test")
    db_session.add(ex)
    db_session.commit()
    db_session.refresh(ex)

    response = internal_client.patch(f"/api/internal/tasks/{ex.id}", json={"heartbeat": True})
    assert response.status_code == 200

    db_session.refresh(ex)
    assert ex.status == ExecutionStatus.IN_PROGRESS
    assert ex.heartbeat_at is not None


def test_get_stale_tasks(internal_client, db_session: Session):
    # Create a stale task
    stale_time = datetime.now(pytz.utc) - timedelta(minutes=10)
    ex = TaskExecution(
        task_type="stale_test",
        status=ExecutionStatus.IN_PROGRESS,
        heartbeat_at=stale_time,
        triggered_by="test",
    )
    db_session.add(ex)
    db_session.commit()

    response = internal_client.get("/api/internal/tasks/stale?timeout_seconds=300")
    assert response.status_code == 200
    data = response.json()
    assert str(ex.id) in data


def test_internal_api_unauthorized(client):
    response = client.get("/api/internal/tasks/stale")
    assert response.status_code == 401


def test_get_secrets_from_db(internal_client, db_session: Session):
    # Setup: Create a TaskDefinitionModel with secrets
    from app.settings.core.models import CoreSetting

    db_session.add(CoreSetting(key="INTERNAL_SECRET", value="internal_val", type="string"))

    db_def = TaskDefinitionModel(
        name="internal_task",
        display_name="Internal Task",
        category="system",
        permission="tasks:read",
        secrets=["INTERNAL_SECRET"],
    )
    db_session.add(db_def)
    db_session.commit()

    response = internal_client.post("/api/internal/secrets", json={"task_type": "internal_task"})
    assert response.status_code == 200
    assert response.json()["secrets"] == {"INTERNAL_SECRET": "internal_val"}


def test_secrets_returns_empty_for_unknown_task(internal_client):
    response = internal_client.post("/api/internal/secrets", json={"task_type": "unknown_task"})
    assert response.status_code == 200
    assert response.json() == {"secrets": {}}


def test_create_task_execution_from_schedule(internal_client, db_session: Session):
    # Setup: Create a PeriodicTask
    import json

    p_task = PeriodicTask(
        name="test_schedule",
        task="tasks.dispatch",
        kwargs=json.dumps({"task_type": "scheduled_task", "foo": "bar"}),
        enabled=True,
    )
    db_session.add(p_task)
    db_session.commit()

    response = internal_client.post(
        "/api/internal/task_execution", json={"schedule_id": "test_schedule"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "execution_id" in data
    assert data["task_type"] == "scheduled_task"
    assert data["params"]["foo"] == "bar"

    # Verify DB
    execution = (
        db_session.query(TaskExecution).filter(TaskExecution.id == data["execution_id"]).first()
    )
    assert execution is not None
    assert execution.task_type == "scheduled_task"
    assert execution.triggered_by == "schedule:test_schedule"


def test_receive_task_result_success(internal_client, db_session: Session):
    # Setup: Create an execution
    ex = TaskExecution(task_type="test_task", status=ExecutionStatus.PENDING, triggered_by="test")
    db_session.add(ex)
    db_session.commit()
    db_session.refresh(ex)

    with patch("app.tasks.api.internal.dispatch_result") as mock_dispatch:
        mock_dispatch.return_value = {"processed": "internal_data"}

        response = internal_client.post(
            f"/api/internal/tasks/{ex.id}/result",
            json={"status": "SUCCESS", "result": {"raw": "data"}},
        )
        assert response.status_code == 200

        db_session.refresh(ex)
        assert ex.status == ExecutionStatus.SUCCESS
        assert ex.result == {"processed": "internal_data"}
        mock_dispatch.assert_called_once()
