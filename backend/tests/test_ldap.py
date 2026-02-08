from unittest.mock import MagicMock, patch

import pytest
from ldap3 import Connection, Server
from sqlalchemy.orm import Session

from app.settings.ldap.models import LdapSetting
from app.settings.ldap.services import get_ldap_setting_by_key, update_ldap_setting
from app.users.ldap.services import (
    authenticate_ldap_user,
    connect_to_ldap,
    get_ldap_user_info,
    normalize_object_guid,
)
from app.users.models import User

# Константы для тестов
TEST_UUID_AD = "550e8400-e29b-41d4-a716-446655440000"
TEST_UUID_OPEN = "6ba7b810-9dad-11d1-80b4-00c04fd430c8"
AD_OID = "1.2.840.113556.1.4.800"


@pytest.fixture
def ldap_settings(db_session: Session):
    """
    Фикстура для инициализации базовых настроек LDAP.
    Создает записи, если их нет, и обновляет значения.
    """
    settings_to_set = {
        "LDAP_ENABLED": ("bool", True),
        "LDAP_URI": ("string", "ldap://localhost:389"),
        "LDAP_BASE_DN": ("string", "dc=example,dc=com"),
        "LDAP_BIND_DN": ("string", "cn=admin,dc=example,dc=com"),
        "LDAP_BIND_PASSWORD": ("string", "admin_password"),
        "LDAP_USER_FILTER": ("string", ""),
    }

    for key, (type_str, value) in settings_to_set.items():
        db_setting = get_ldap_setting_by_key(db_session, key)
        if not db_setting:
            db_setting = LdapSetting(
                key=key, value=str(value), type=type_str, is_sensitive=(key == "LDAP_BIND_PASSWORD")
            )
            db_session.add(db_setting)
            db_session.commit()

        update_ldap_setting(db_session, key, value)

    return settings_to_set


class MockLdapEntry:
    def __init__(self, dn, attributes):
        self.entry_dn = dn
        self._attributes = attributes

    def __getattr__(self, name):
        if name in self._attributes:
            mock = MagicMock()
            mock.value = self._attributes[name]
            # Добавляем raw_values для тестирования objectGUID
            if name == "objectGUID":
                mock.raw_values = [self._attributes[name]]
            return mock
        raise AttributeError(name)


def create_mock_connection(
    server_type="ad", user_found=True, bind_success=True, object_guid_format="bytes"
):
    mock_conn = MagicMock(spec=Connection)
    mock_server = MagicMock(spec=Server)

    # Эмуляция инфо о сервере
    mock_server.info.supported_capabilities = [AD_OID] if server_type == "ad" else []
    mock_server.info.other = {}
    # Моделируем vendor_name для новой логики определения
    if server_type == "ad":
        mock_server.info.other["forestFunctionality"] = "5"
        mock_server.info.vendor_name = "Microsoft"
    else:
        # Для openldap это поле может отсутствовать или быть другим
        mock_server.info.vendor_name = "OpenLDAP"

    mock_conn.server = mock_server

    if user_found:
        if server_type == "ad":
            import uuid

            guid_bytes = uuid.UUID(TEST_UUID_AD).bytes_le

            if object_guid_format == "bytes":
                guid_value = guid_bytes
            elif object_guid_format == "str":
                guid_value = TEST_UUID_AD
            elif object_guid_format == "str_braces":
                guid_value = f"{{{TEST_UUID_AD}}}"
            else:
                guid_value = guid_bytes  # По умолчанию

            attributes = {
                "sAMAccountName": "ldapuser",
                "objectGUID": guid_value,
                "displayName": "Ldap User AD",
                "mail": "ldap@ad.com",
            }
        else:
            attributes = {
                "uid": "openuser",
                "entryUUID": TEST_UUID_OPEN,
                "cn": "Open Ldap User",
                "mail": "open@ldap.com",
            }

        entry = MockLdapEntry("cn=user,dc=example,dc=com", attributes)
        mock_conn.entries = [entry]
    else:
        mock_conn.entries = []

    mock_conn.bind.return_value = bind_success
    return mock_conn, mock_server


def test_normalize_object_guid():
    """
    Тест функции нормализации objectGUID.
    """
    import uuid

    guid_bytes = uuid.UUID(TEST_UUID_AD).bytes_le

    # Тест с байтами
    assert normalize_object_guid(guid_bytes) == TEST_UUID_AD

    # Тест со строкой
    assert normalize_object_guid(TEST_UUID_AD) == TEST_UUID_AD

    # Тест со строкой в скобках
    assert normalize_object_guid(f"{{{TEST_UUID_AD}}}") == TEST_UUID_AD

    # Тест с неверным типом
    with pytest.raises(ValueError):
        normalize_object_guid(12345)


def test_get_ldap_user_info_objectguid_formats(db_session):
    """
    Тест извлечения UUID при разных форматах objectGUID.
    """
    # 1. objectGUID как bytes
    mock_conn_bytes, mock_server_bytes = create_mock_connection(object_guid_format="bytes")
    info_bytes = get_ldap_user_info(mock_conn_bytes.entries[0], "ad")
    assert info_bytes["ldap_id"] == TEST_UUID_AD

    # 2. objectGUID как строка
    mock_conn_str, mock_server_str = create_mock_connection(object_guid_format="str")
    info_str = get_ldap_user_info(mock_conn_str.entries[0], "ad")
    assert info_str["ldap_id"] == TEST_UUID_AD

    # 3. objectGUID как строка со скобками
    mock_conn_braces, mock_server_braces = create_mock_connection(object_guid_format="str_braces")
    info_braces = get_ldap_user_info(mock_conn_braces.entries[0], "ad")
    assert info_braces["ldap_id"] == TEST_UUID_AD


def test_connect_to_ldap_ad(db_session, ldap_settings):
    """
    Тест 2.2.2: Подключение и автоопределение Active Directory.
    """
    mock_conn, mock_server = create_mock_connection(server_type="ad")
    with (
        patch("app.core.ldap_service.create_ldap_server", return_value=mock_server),
        patch("app.core.ldap_service.create_ldap_connection", return_value=mock_conn),
        patch("app.core.ldap_service.detect_server_type", return_value="ad"),
    ):
        conn, server_type = connect_to_ldap(db_session)
        assert conn is not None
        assert server_type == "ad"


def test_connect_to_ldap_openldap(db_session, ldap_settings):
    """
    Тест 2.2.2: Подключение и автоопределение OpenLDAP.
    """
    mock_conn, mock_server = create_mock_connection(server_type="openldap")
    with (
        patch("app.core.ldap_service.create_ldap_server", return_value=mock_server),
        patch("app.core.ldap_service.create_ldap_connection", return_value=mock_conn),
        patch("app.core.ldap_service.detect_server_type", return_value="openldap"),
    ):
        conn, server_type = connect_to_ldap(db_session)
        assert conn is not None
        assert server_type == "openldap"


def test_authenticate_ldap_user_success(db_session, ldap_settings):
    """
    Тест 2.2.3: Успешная аутентификация пользователя.
    """
    mock_conn, mock_server = create_mock_connection(server_type="ad")
    with (
        patch("app.core.ldap_service.create_ldap_server", return_value=mock_server),
        patch("app.core.ldap_service.create_ldap_connection", side_effect=[mock_conn, mock_conn]),
        patch("app.core.ldap_service.detect_server_type", return_value="ad"),
    ):
        entry, server_type = authenticate_ldap_user(db_session, "ldapuser", "password")
        assert entry is not None
        assert server_type == "ad"
        info = get_ldap_user_info(entry, server_type)
        assert info["ldap_id"] == TEST_UUID_AD
        assert info["login"] == "ldapuser"


def test_authenticate_ldap_user_fail_bind(db_session, ldap_settings):
    """
    Тест 2.2.3: Ошибка пароля (bind fail).
    """
    mock_admin_conn, mock_server = create_mock_connection(user_found=True)
    mock_user_conn, _ = create_mock_connection(bind_success=False)
    with (
        patch("app.core.ldap_service.create_ldap_server", return_value=mock_server),
        patch("app.core.ldap_service.create_ldap_connection", side_effect=[mock_admin_conn, mock_user_conn]),
        patch("app.core.ldap_service.detect_server_type", return_value="ad"),
    ):
        result = authenticate_ldap_user(db_session, "ldapuser", "wrong_password")
        assert result is None


def test_auth_service_auto_provisioning(db_session, ldap_settings):
    """
    Тест 2.4.3: Автоматическое создание пользователя при первом входе.
    """
    from app.auth.services import AuthService

    auth_service = AuthService(db_session, permission_service=MagicMock())
    mock_conn, mock_server = create_mock_connection(server_type="ad")

    # Проверяем, что пользователя нет
    user_in_db = db_session.query(User).filter(User.login == "ldapuser").first()
    assert user_in_db is None

    with (
        patch("app.core.ldap_service.create_ldap_server", return_value=mock_server),
        patch("app.core.ldap_service.create_ldap_connection", side_effect=[mock_conn, mock_conn]),
        patch("app.core.ldap_service.detect_server_type", return_value="ad"),
    ):
        user = auth_service.authenticate_user("ldapuser", "password")
        assert user is not None
        assert user.login == "ldapuser"
        assert user.type == "ldap"
        assert user.ldap_id == TEST_UUID_AD

        # Проверяем в БД
        db_session.expire_all()
        user_db = db_session.query(User).filter(User.ldap_id == TEST_UUID_AD).first()
        assert user_db is not None
        assert user_db.login == "ldapuser"


def test_auth_service_sync_on_login_change(db_session, ldap_settings):
    """
    Тест 2.4.2: Синхронизация логина по UUID.
    """
    from app.auth.services import AuthService

    # 1. Создаем пользователя со старым логином
    old_user = User(
        login="old_login", name="Old Name", type="ldap", ldap_id=TEST_UUID_AD, is_active=True
    )
    db_session.add(old_user)
    db_session.commit()

    auth_service = AuthService(db_session, permission_service=MagicMock())
    # Мок возвращает новый логин 'ldapuser' для того же UUID
    mock_conn, mock_server = create_mock_connection(server_type="ad")

    with (
        patch("app.core.ldap_service.create_ldap_server", return_value=mock_server),
        patch("app.core.ldap_service.create_ldap_connection", side_effect=[mock_conn, mock_conn]),
        patch("app.core.ldap_service.detect_server_type", return_value="ad"),
    ):
        user = auth_service.authenticate_user("ldapuser", "password")
        assert user.id == old_user.id
        assert user.login == "ldapuser"  # Логин обновился
        assert user.name == "Ldap User AD"  # Имя обновилось


def test_auth_service_ldap_disabled(db_session, ldap_settings):
    """
    Тест: поведение при выключенном LDAP.
    """
    from app.auth.services import AuthService

    update_ldap_setting(db_session, "LDAP_ENABLED", False)
    auth_service = AuthService(db_session, permission_service=MagicMock())

    with pytest.raises(Exception) as exc:
        auth_service.authenticate_user("any_user", "any_pass")
    assert "Invalid_credentials" in str(exc.value)


def test_authenticate_ldap_user_with_complex_filter(db_session, ldap_settings):
    """
    Тест для проверки правильного построения фильтра LDAP со сложным фильтром пользователя.
    """
    update_ldap_setting(
        db_session, "LDAP_USER_FILTER", "(&(objectClass=user)(memberOf=CN=group,DC=test,DC=local))"
    )

    mock_conn, mock_server = create_mock_connection(server_type="ad")

    with (
        patch("app.core.ldap_service.create_ldap_server", return_value=mock_server),
        patch("app.core.ldap_service.create_ldap_connection", side_effect=[mock_conn, mock_conn]),
        patch("app.core.ldap_service.detect_server_type", return_value="ad"),
    ):
        authenticate_ldap_user(db_session, "ldapuser", "password")

        # Проверяем, что метод search был вызван с правильным, плоским фильтром
        expected_filter = (
            "(&(objectClass=user)(memberOf=CN=group,DC=test,DC=local)(sAMAccountName=ldapuser))"
        )
        mock_conn.search.assert_called_with(
            search_base="dc=example,dc=com", search_filter=expected_filter, attributes=["*", "+"]
        )


def test_connect_to_ldap_tls_check(db_session, ldap_settings):
    """
    Тест 2.2.4: Проверка конфигурации TLS при использовании ldaps://.
    Проверяет, что используется ssl.PROTOCOL_TLS_CLIENT.
    """
    import ssl
    from unittest.mock import patch

    from app.users.ldap.services import connect_to_ldap

    # 1. Настраиваем URI на LDAPS
    update_ldap_setting(db_session, "LDAP_URI", "ldaps://localhost:636")

    # 2. Мокаем Tls, Server и Connection
    with (
        patch("app.core.ldap_service.Server"),
        patch("app.core.ldap_service.create_ldap_connection"),
        patch("app.core.ldap_service.Tls") as mock_tls_cls,
    ):
        connect_to_ldap(db_session)

        # 3. Проверяем аргументы Tls
        # Мы ожидаем validate=ssl.CERT_NONE и version=ssl.PROTOCOL_TLS_CLIENT
        mock_tls_cls.assert_called_with(validate=ssl.CERT_REQUIRED, version=ssl.PROTOCOL_TLS)
