"""
Модуль для низкоуровневой работы с LDAP (подключение, TLS).
Централизует логику, используемую в users, settings и tasks.
"""

import logging
import ssl
from typing import Any

from ldap3 import NONE, SIMPLE, Connection, Server, Tls

logger = logging.getLogger(__name__)

# OID для Active Directory (в Root DSE)
AD_OID = "1.2.840.113556.1.4.800"


def get_ldap_tls_config(verify: bool = True) -> Tls:
    """
    Создает конфигурацию TLS для подключения к LDAPS.

    Args:
        verify: Если True, то выполняется проверка сертификата (ssl.CERT_REQUIRED).
                Если False, то проверка отключена (ssl.CERT_NONE).

    Returns:
        Объект ldap3.Tls
    """
    version = ssl.PROTOCOL_TLS

    if verify:
        validate = ssl.CERT_REQUIRED
    else:
        validate = ssl.CERT_NONE

    return Tls(validate=validate, version=version)


def create_ldap_server(uri: str, use_tls: bool | None = None, tls_verify: bool = True) -> Server:
    """
    Создает объект ldap3.Server.

    Оптимизация: по умолчанию get_info=NONE, чтобы не делать лишних запросов схемы/info,
    которые могут быть тяжелыми или не возвращать нужных операционных атрибутов.

    Args:
        uri: URI сервера (например, "ldaps://example.com" или "ldap://example.com")
        use_tls: Принудительное использование TLS. Если None, определяется по протоколу в URI.
        tls_verify: Проверять ли TLS сертификат сервера.

    Returns:
        Объект ldap3.Server
    """
    if use_tls is None:
        use_tls = uri.lower().startswith("ldaps://")

    tls_config = None
    if use_tls:
        tls_config = get_ldap_tls_config(verify=tls_verify)

    # Используем NONE для ускорения инициализации. Необходимые данные запрашиваем вручную.
    return Server(uri, use_ssl=use_tls, tls=tls_config, get_info=NONE)


def create_ldap_connection(
    server: Server,
    bind_dn: str | None = None,
    bind_password: str | None = None,
    auto_bind: bool = True,
    **kwargs: Any,
) -> Connection:
    """
    Создает объект ldap3.Connection.

    Args:
        server: Объект Server
        bind_dn: DN пользователя для бинда (если None — анонимное/SASL в зависимости от реализации)
        bind_password: Пароль
        auto_bind: Выполнять ли bind сразу при создании (True/False или ldap3.AUTO_BIND_NO_TLS и т.д.)
        **kwargs: Дополнительные аргументы для конструктора Connection (например, receive_timeout)

    Returns:
        Объект ldap3.Connection
    """
    if bind_dn and bind_password:
        return Connection(
            server,
            user=bind_dn,
            password=bind_password,
            authentication=SIMPLE,
            auto_bind=auto_bind,
            **kwargs,
        )
    else:
        # Анонимное или без авторизации
        return Connection(server, auto_bind=auto_bind, **kwargs)


def detect_server_type(server: Server, connection: Connection | None = None) -> str:
    """
    Определяет тип сервера (Active Directory или OpenLDAP).
    Выполняет оптимизированный запрос Root DSE для получения только необходимых атрибутов.

    Args:
        server: Объект Server
        connection: Активное соединение (обязательно для выполнения manual search)

    Returns:
        'ad' или 'openldap'
    """
    # Если есть соединение, делаем точный запрос
    if connection and connection.bound:
        try:
            # Запрашиваем только то, что влияет на определение типа
            # supportedCapabilities (OID), forestFunctionality (AD), vendorName (AD/Other) - Проверка возможностей
            if connection.search(
                search_base="",
                search_filter="(objectClass=*)",
                search_scope="BASE",
                attributes=["supportedCapabilities", "forestFunctionality", "vendorName"],
            ):
                if connection.entries:
                    dse = connection.entries[0]

                    # 1. Проверка по OID
                    if (
                        "supportedCapabilities" in dse
                        and AD_OID in dse["supportedCapabilities"].values
                    ):
                        logger.info(f"LDAP Server detected as: Active Directory (via OID {AD_OID})")
                        return "ad"

                    # 2. Проверка по forestFunctionality
                    if "forestFunctionality" in dse:
                        logger.info(
                            "LDAP Server detected as: Active Directory (via forestFunctionality)"
                        )
                        return "ad"

                    # 3. Проверка по vendorName
                    if "vendorName" in dse:
                        vendor = str(dse["vendorName"].value).lower()
                        if "microsoft" in vendor:
                            logger.info(
                                f"LDAP Server detected as: Active Directory (via vendorName '{vendor}')"
                            )
                            return "ad"
        except Exception as e:
            logger.warning(f"Error during manual server detection: {e}")

    # Fallback на server.info если он был загружен ранее (например, если Server создан кем-то другим с get_info=ALL)
    if server.info:
        logger.info("Falling back to server.info for detection")
        if (
            hasattr(server.info, "supportedCapabilities")
            and AD_OID in server.info.supportedCapabilities
        ):
            return "ad"

        if hasattr(server.info, "other") and server.info.other:
            other = server.info.other
            if "forestFunctionality" in other:
                return "ad"
            if "vendorName" in other and "microsoft" in other["vendorName"][0].lower():
                return "ad"

    logger.info("LDAP Server detected as: OpenLDAP (default)")
    return "openldap"
