from sqlalchemy.orm import Session

from app.tasks.models import ExecutionStatus, TaskExecution
from app.tasks.tasks.cleanup_zombie import result_handler


def test_result_handler_cleanup_stats(db_session: Session):
    """Тест: обработка списка зависших задач."""
    # Setup: Create some "zombie" tasks
    ex1 = TaskExecution(task_type="t1", status=ExecutionStatus.IN_PROGRESS, triggered_by="test")
    ex2 = TaskExecution(task_type="t2", status=ExecutionStatus.IN_PROGRESS, triggered_by="test")
    db_session.add_all([ex1, ex2])
    db_session.commit()

    terminated_ids = [str(ex1.id), str(ex2.id)]
    result = {"terminated_ids": terminated_ids}

    response = result_handler(result, db_session)

    assert "Успешно обработано 2 задач" in response["summary"]
    assert response["terminated_ids"] == terminated_ids

    # Verify DB state
    db_session.refresh(ex1)
    db_session.refresh(ex2)
    assert ex1.status == ExecutionStatus.FAILURE
    assert ex2.status == ExecutionStatus.FAILURE
    assert ex1.result == {"error": "Task hung (timeout) or worker lost"}


def test_result_handler_empty_cleanup(db_session: Session):
    """Тест: пустой список — ничего не меняется."""
    result = {"terminated_ids": []}
    response = result_handler(result, db_session)

    assert "обработано 0 задач" in response["summary"]
    assert response["terminated_ids"] == []
