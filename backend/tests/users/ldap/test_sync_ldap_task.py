from unittest.mock import patch

from sqlalchemy.orm import Session

from app.users.ldap.tasks.sync_ldap import result_handler
from app.users.models import User


def test_result_handler_empty_data(db_session: Session):
    """Тест: пустые данные от воркера — возвращаем ошибку."""
    result = {"users": []}
    response = result_handler(result, db_session)
    assert "error" in response
    assert "no users" in response["error"].lower()


def test_result_handler_sync_calls_service(db_session: Session):
    """Тест: проверка вызова сервиса синхронизации."""
    users_data = [
        {"login": "user1", "ldap_id": "uuid1", "full_name": "User One"},
        {"login": "user2", "ldap_id": "uuid2", "full_name": "User Two"},
    ]
    result = {"users": users_data}

    with patch("app.users.ldap.services.sync_ldap_users_batch") as mock_sync:
        mock_sync.return_value = {"created": 2, "updated": 0}

        response = result_handler(result, db_session)

        mock_sync.assert_called_once_with(db_session, users_data)
        assert response == {"created": 2, "updated": 0}


def test_result_handler_integration_processing(db_session: Session):
    """Интеграционный тест: создание пользователя через result_handler."""
    # Setup: Existing user to update
    existing = User(
        login="existing", name="Old Name", ldap_id="id-existing", type="ldap", is_active=True
    )
    db_session.add(existing)
    db_session.commit()

    users_data = [
        {"login": "existing", "ldap_id": "id-existing", "full_name": "New Name", "is_active": True},
        {"login": "newuser", "ldap_id": "id-new", "full_name": "New User", "is_active": True},
    ]
    result = {"users": users_data}

    # Резолвер должен найти и обновить 'existing' и создать 'newuser'
    response = result_handler(result, db_session)

    assert response["created"] == 1
    assert response["updated"] == 1

    # Проверка в БД
    updated = db_session.query(User).filter(User.login == "existing").first()
    assert updated.name == "New Name"

    created = db_session.query(User).filter(User.login == "newuser").first()
    assert created is not None
    assert created.ldap_id == "id-new"
