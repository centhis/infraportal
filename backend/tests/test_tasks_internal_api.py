
import pytest
from app.core.config import settings
from app.tasks.models import TaskExecution, ExecutionStatus
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import pytz

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
        f"/api/internal/tasks/{ex.id}",
        json={"status": "SUCCESS", "result": {"foo": "bar"}}
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
    
    response = internal_client.patch(
        f"/api/internal/tasks/{ex.id}",
        json={"heartbeat": True}
    )
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
        triggered_by="test"
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
