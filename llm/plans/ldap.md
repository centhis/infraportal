# Рефакторинг логики подключения к LDAP

## Описание проблемы
В проекте обнаружено дублирование логики подключения к LDAP в модулях `app/users/ldap/services.py` и `app/settings/ldap/services.py`. Это нарушает принцип DRY. Также необходимо добавить настройку `LDAP_TLS_VERIFY` для управления проверкой сертификатов.

## План Реализации

### 1. Core Module
- [x] **1.1. Создать [ldap_service.py](file:///home/centhis/infraportal/backend/app/core/ldap_service.py)**
  - Определение константы `AD_OID`.
  - Функция `get_ldap_tls_config(verify: bool)` для централизованной настройки SSL/TLS с учетом флага проверки.
  - Функция `create_ldap_server(uri: str)` для создания объекта `Server`.
  - Функция `create_ldap_connection(server, user=None, password=None, **kwargs)` для создания `Connection`.
  - Функция `detect_server_type(server: Server) -> str` для определения типа сервера (AD vs OpenLDAP).

### 2. Users Module
- [x] **2.1. Обновить [services.py](file:///home/centhis/infraportal/backend/app/users/ldap/services.py)**
  - Удаление дублирующейся логики инициализации TLS и сервера.
  - Использование `ldap_service` для подключения и определения типа сервера.

### 3. Settings Module
- [x] **3.1. Обновить [services.py](file:///home/centhis/infraportal/backend/app/settings/ldap/services.py)**
  - Удаление дублирующейся логики в `test_ldap_connection`.
  - Использование `ldap_service` для создания соединения.
- [x] **3.2. Обновить [initial_data.py](file:///home/centhis/infraportal/backend/app/settings/ldap/initial_data.py)**
  - Добавление настройки `LDAP_TLS_VERIFY` (значение по умолчанию `true`).

### 4. Frontend Module
- [x] **4.1. Обновить [LdapSettingsPage.tsx](file:///home/centhis/infraportal/frontend/src/modules/settings/ui/pages/LdapSettingsPage.tsx)**
  - Добавить `LDAP_TLS_VERIFY` в список `CONNECTION_SETTINGS` для отображения в UI.

### 5. Проверка (Verification)
- [x] **5.1. Автоматизированные тесты**
  - Запуск `pytest tests/test_ldap.py` (Выполнено, успешно).
  - Запуск `pytest tests/test_settings_ldap.py` (Выполнено, успешно).
- [x] **5.2. Линтинг**
  - `ruff check app/core/ldap_service.py` (Выполнено).
  - `python3 -m tools.lang_linter app/` (Выполнено, исправлены новые ошибки).
