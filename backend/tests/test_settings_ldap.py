from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient
from ldap3.core.exceptions import LDAPException, LDAPInvalidDnError, LDAPInvalidFilterError
from sqlalchemy.orm import Session

from app.core.security import decrypt_value, encrypt_value
from app.settings.ldap import services
from app.settings.ldap.models import LdapSetting

# --- Фикстуры ---


@pytest.fixture
def ldap_settings_data(db_session: Session):
    """
    Фикстура для создания начальных настроек LDAP.
    """
    settings_list = [
        LdapSetting(
            key="LDAP_URI", value="ldap://localhost:389", type="string", is_sensitive=False
        ),
        LdapSetting(
            key="LDAP_BIND_DN",
            value="cn=admin,dc=example,dc=com",
            type="string",
            is_sensitive=False,
        ),
        LdapSetting(
            key="LDAP_BIND_PASSWORD", value="secret", type="password", is_sensitive=True
        ),  # Обычно шифруется сервисной логикой, но здесь вставляем как есть.
        # В идеале нужно использовать сервис для вставки или шифровать вручную.
        # Вставляем raw и предполагаем, что шифрование происходит при обновлении.
        LdapSetting(key="LDAP_ENABLED", value="true", type="bool", is_sensitive=False),
        LdapSetting(
            key="LDAP_BASE_DN",
            value="ou=users,dc=example,dc=com",
            type="string",
            is_sensitive=False,
        ),
        LdapSetting(
            key="LDAP_USER_FILTER", value="(uid={username})", type="string", is_sensitive=False
        ),
    ]

    # Вручную шифруем пароль для фикстуры, чтобы эмулировать реальное состояние
    for s in settings_list:
        if s.key == "LDAP_BIND_PASSWORD":
            s.value = encrypt_value(s.value)

    db_session.add_all(settings_list)
    db_session.commit()
    for s in settings_list:
        db_session.refresh(s)
    return settings_list


@pytest.fixture
def valid_ldap_test_data():
    """
    Валидные настройки LDAP для тестирования соединения.
    """
    return {
        "settings": {
            "LDAP_URI": "ldap://fake-ldap.com",
            "LDAP_BIND_DN": "cn=admin,dc=example,dc=com",
            "LDAP_BIND_PASSWORD": "password",
            "LDAP_BASE_DN": "ou=users,dc=example,dc=com",
            "LDAP_USER_FILTER": "(uid=testuser)",
        }
    }


# --- API Тесты ---


def test_get_all_ldap_settings(authenticated_client: TestClient, ldap_settings_data):
    """
    Тест 1.12.2: Успешное получение всех настроек LDAP.
    """
    response = authenticated_client.get("/api/v1/settings/ldap")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= len(ldap_settings_data)

    # Проверка простого значения
    uri_setting = next(s for s in data if s["key"] == "LDAP_URI")
    assert uri_setting["value"] == "ldap://localhost:389"

    # Проверка маскировки чувствительных данных
    # Примечание: LdapSettingSchema требует логики маскировки, аналогичной CoreSettingSchema
    pass_setting = next(s for s in data if s["key"] == "LDAP_BIND_PASSWORD")
    # Если маскировка реализована в схеме (должна быть!), эта проверка пройдет.
    # Если нет, нужно реализовать его в схеме.
    # пока проверяем:

    assert pass_setting["value"] == "********"


def test_get_ldap_setting_by_key(authenticated_client: TestClient, ldap_settings_data):
    """
    Тест 1.12.3: Успешное получение одной настройки LDAP.
    """
    response = authenticated_client.get("/api/v1/settings/ldap/LDAP_URI")
    assert response.status_code == 200
    data = response.json()
    assert data["key"] == "LDAP_URI"
    assert data["value"] == "ldap://localhost:389"


def test_update_ldap_setting(authenticated_client: TestClient, ldap_settings_data, db_session):
    """
    Тест 1.12.4: Обновление настройки LDAP.
    """
    # 1. Обновление обычной настройки
    update_data = {"value": "ldap://new-host:389"}
    response = authenticated_client.put("/api/v1/settings/ldap/LDAP_URI", json=update_data)
    assert response.status_code == 200
    assert response.json()["value"] == "ldap://new-host:389"

    # 2. Обновление пароля (должен быть зашифрован)
    new_pass = "new_secret_password"
    update_pass = {"value": new_pass}
    response = authenticated_client.put(
        "/api/v1/settings/ldap/LDAP_BIND_PASSWORD", json=update_pass
    )
    assert response.status_code == 200

    # Проверка в БД, что зашифровано
    db_pass = services.get_ldap_setting_by_key(db_session, "LDAP_BIND_PASSWORD")
    assert db_pass.value != new_pass
    assert decrypt_value(db_pass.value) == new_pass


def test_get_is_ldap_enabled(authenticated_client: TestClient, ldap_settings_data):
    """
    Тест 1.12.5: Проверка эндпоинта is_enabled.
    """
    response = authenticated_client.get("/api/v1/settings/ldap/is_enabled")
    assert response.status_code == 200
    assert response.json()["enabled"] is True


# --- Тесты API подключения LDAP (Новые) ---


def test_test_ldap_connection_success(authenticated_client: TestClient, valid_ldap_test_data):
    """
    Тестирует успешное подключение и поиск в LDAP.
    """
    with (
        patch("app.core.ldap_service.create_ldap_connection") as MockConnection,
        patch("app.core.ldap_service.create_ldap_server"),
    ):
        # Мок экземпляра соединения
        mock_conn_instance = MockConnection.return_value
        # Эмуляция успешного bind
        mock_conn_instance.bind.return_value = True
        # Эмуляция успешного поиска (найден хотя бы один пользователь)
        mock_conn_instance.search.return_value = True

        response = authenticated_client.post(
            "/api/v1/settings/ldap/test", json=valid_ldap_test_data
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "successful" in data["message"]
        # Проверка вызова unbind
        mock_conn_instance.unbind.assert_called_once()


def test_test_ldap_connection_bind_fails(authenticated_client: TestClient, valid_ldap_test_data):
    """
    Тестирует подключение к LDAP при сбое bind (например, неверные учетные данные).
    """
    with (
        patch("app.core.ldap_service.create_ldap_connection") as MockConnection,
        patch("app.core.ldap_service.create_ldap_server"),
    ):
        mock_conn_instance = MockConnection.return_value
        # Эмуляция сбоя bind
        mock_conn_instance.bind.return_value = False
        # Описание результата сбоя
        mock_conn_instance.result = {"description": "invalidCredentials"}

        response = authenticated_client.post(
            "/api/v1/settings/ldap/test", json=valid_ldap_test_data
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is False
        assert "Bind failed" in data["message"]
        assert "invalidCredentials" in data["message"]
        mock_conn_instance.unbind.assert_called_once()  # Unbind должен быть вызван


def test_test_ldap_connection_search_fails_no_results(
    authenticated_client: TestClient, valid_ldap_test_data
):
    """
    Тестирует подключение к LDAP, когда поиск не возвращает результатов, но в остальном успешен.
    """
    with (
        patch("app.core.ldap_service.create_ldap_connection") as MockConnection,
        patch("app.core.ldap_service.create_ldap_server"),
    ):
        mock_conn_instance = MockConnection.return_value
        mock_conn_instance.bind.return_value = True
        # Эмуляция поиска без результатов
        mock_conn_instance.search.return_value = False

        response = authenticated_client.post(
            "/api/v1/settings/ldap/test", json=valid_ldap_test_data
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is False
        assert "returned no results" in data["message"]
        mock_conn_instance.unbind.assert_called_once()


def test_test_ldap_connection_invalid_dn_error(
    authenticated_client: TestClient, valid_ldap_test_data
):
    """
    Тестирует подключение к LDAP при возникновении LDAPInvalidDnError (например, плохой BASE_DN).
    """
    # Патч конструктора Connection для генерации LDAPInvalidDnError
    with (
        patch(
            "app.core.ldap_service.create_ldap_connection",
            side_effect=LDAPInvalidDnError("Invalid DN format"),
        ) as MockConnection,
        patch("app.core.ldap_service.create_ldap_server"),
    ):
        response = authenticated_client.post(
            "/api/v1/settings/ldap/test", json=valid_ldap_test_data
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is False
        assert "Invalid DN syntax" in data["message"]
        # В этом случае соединение может быть не создано, поэтому unbind не вызывается
        MockConnection.assert_called_once()  # Проверка попытки соединения


def test_test_ldap_connection_invalid_filter_error(
    authenticated_client: TestClient, valid_ldap_test_data
):
    """
    Тестирует подключение к LDAP при возникновении LDAPInvalidFilterError (например, плохой USER_FILTER).
    """
    with (
        patch("app.core.ldap_service.create_ldap_connection") as MockConnection,
        patch("app.core.ldap_service.create_ldap_server"),
    ):
        mock_conn_instance = MockConnection.return_value
        mock_conn_instance.bind.return_value = True
        # Эмуляция выброса ошибки фильтра
        mock_conn_instance.search.side_effect = LDAPInvalidFilterError("Bad filter syntax")

        response = authenticated_client.post(
            "/api/v1/settings/ldap/test", json=valid_ldap_test_data
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is False
        assert "Invalid filter syntax" in data["message"]
        mock_conn_instance.unbind.assert_called_once()


def test_test_ldap_connection_generic_ldap_error(
    authenticated_client: TestClient, valid_ldap_test_data
):
    """
    Тестирует подключение к LDAP при возникновении общей ошибки LDAPException (например, невозможно подключиться к URI).
    """
    # Патч конструктора Connection для генерации LDAPException
    with (
        patch(
            "app.core.ldap_service.create_ldap_connection",
            side_effect=LDAPException("Connection refused"),
        ) as MockConnection,
        patch("app.core.ldap_service.create_ldap_server"),
    ):
        response = authenticated_client.post(
            "/api/v1/settings/ldap/test", json=valid_ldap_test_data
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is False
        assert "Check LDAP_URI and connectivity" in data["message"]
        MockConnection.assert_called_once()  # Проверка попытки соединения


def test_test_ldap_connection_missing_settings(authenticated_client: TestClient):
    """
    Тестирует подключение к LDAP, когда отсутствуют обязательные настройки.
    """
    # Отсутствует LDAP_URI
    test_data_missing_uri = {
        "settings": {
            "LDAP_BIND_DN": "cn=admin,dc=example,dc=com",
            "LDAP_BIND_PASSWORD": "password",
            "LDAP_BASE_DN": "ou=users,dc=example,dc=com",
            "LDAP_USER_FILTER": "(uid=testuser)",
        }
    }
    response = authenticated_client.post("/api/v1/settings/ldap/test", json=test_data_missing_uri)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is False
    assert "Missing required LDAP settings: uri" in data["message"]

    # Отсутствует LDAP_BASE_DN
    test_data_missing_base_dn = {
        "settings": {
            "LDAP_URI": "ldap://fake-ldap.com",
            "LDAP_BIND_DN": "cn=admin,dc=example,dc=com",
            "LDAP_BIND_PASSWORD": "password",
            "LDAP_USER_FILTER": "(uid=testuser)",
        }
    }
    response = authenticated_client.post(
        "/api/v1/settings/ldap/test", json=test_data_missing_base_dn
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is False
    assert "Missing required LDAP settings: base_dn" in data["message"]


# --- RBAC Тесты ---


def test_permissions_ldap_is_enabled_public(client: TestClient, user_factory, ldap_settings_data):
    """
    Тест 1.12.5/1.10.5: is_enabled должен быть доступен любому аутентифицированному пользователю.
    """
    # Пользователь без прав настроек
    user_factory(login="common_user", password="password")
    token_common = client.post(
        "/api/v1/auth/login", json={"login": "common_user", "password": "password"}
    ).json()["access_token"]

    client_common = TestClient(client.app)
    client_common.headers["Authorization"] = f"Bearer {token_common}"

    response = client_common.get("/api/v1/settings/ldap/is_enabled")
    assert response.status_code == 200


def test_permissions_ldap_others_protected(client: TestClient, user_factory, ldap_settings_data):
    """
    Тест 1.12.7: Другие эндпоинты должны быть защищены.
    """
    user_factory(login="common_user_2", password="password")
    token_common = client.post(
        "/api/v1/auth/login", json={"login": "common_user_2", "password": "password"}
    ).json()["access_token"]

    client_common = TestClient(client.app)
    client_common.headers["Authorization"] = f"Bearer {token_common}"

    # Попытка получить список
    response = client_common.get("/api/v1/settings/ldap")
    assert response.status_code == 403
    response = client_common.put("/api/v1/settings/ldap/LDAP_URI", json={"value": "test"})
    assert response.status_code == 403
    # test_ldap_settings теперь требует права settings:update
    response = client_common.post("/api/v1/settings/ldap/test", json={})
    assert response.status_code == 403


# --- Тесты Сервиса/Модели ---


def test_service_encryption():
    """
    Тест 1.12.8: Хелперы логики шифрования.
    """
    raw = "secret"
    encrypted = encrypt_value(raw)
    assert encrypted != raw
    assert decrypt_value(encrypted) == raw
    assert decrypt_value(encrypted) != "wrong"


def test_service_is_enabled(db_session: Session, ldap_settings_data):
    """
    Тест сервиса is_ldap_enabled.
    """
    assert services.is_ldap_enabled(db_session) is True

    # Изменить на false
    services.update_ldap_setting(db_session, "LDAP_ENABLED", "false")
    assert services.is_ldap_enabled(db_session) is False


def test_test_ldap_connection_tls_config(authenticated_client: TestClient, valid_ldap_test_data):
    """
    Тест проверяет, что Tls инициализируется с правильными параметрами (PROTOCOL_TLS, CERT_REQUIRED)
    при подключении к LDAPS, согласованно с модулем users.
    """
    import ssl

    with (
        patch("app.core.ldap_service.create_ldap_connection"),
        patch("app.core.ldap_service.Server"),
        patch("app.core.ldap_service.Tls") as MockTls,
    ):
        # Обновление тестовых данных для LDAPS
        data = valid_ldap_test_data.copy()
        data["settings"]["LDAP_URI"] = "ldaps://secure-ldap.com:636"

        response = authenticated_client.post("/api/v1/settings/ldap/test", json=data)

        assert response.status_code == 200
        # Проверка аргументов инициализации Tls
        MockTls.assert_called_with(validate=ssl.CERT_REQUIRED, version=ssl.PROTOCOL_TLS)
