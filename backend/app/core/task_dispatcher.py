from sqlalchemy.orm import Session

from app.core.task_collector import get_task_definition


def dispatch_result(db: Session, task_type: str, result: dict) -> dict:
    """
    Передаёт результат от воркера в result_handler модуля.

    Args:
        db: SQLAlchemy session
        task_type: Имя задачи (например, "users:sync_ldap")
        result: Данные от воркера

    Returns:
        Результат обработки модулем
    """
    task_def = get_task_definition(task_type)

    if not task_def:
        raise ValueError(f"Unknown task type: {task_type}")

    if not task_def.result_handler:
        return {"status": "no_handler", "raw_result": result}

    return task_def.result_handler(result, db)
