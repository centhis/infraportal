# Обзор модуля Settings

## Введение
Модуль **Settings** (`backend/app/settings`) предназначен для централизованного управления конфигурацией приложения. Он позволяет хранить настройки в базе данных, изменять их через API без перезапуска сервисов и обеспечивает типизацию и безопасность данных.

## Архитектура
Модуль разделен на подмодули, соответствующие функциональным областям приложения:

*   **Core Settings (`/settings/core`)**: Основные настройки системы.
*   **LDAP Settings (`/settings/ldap`)**: Настройки интеграции с каталогом LDAP (подключение, маппинг пользователей и т.д.).

### Основные компоненты
*   **Models**: SQLAlchemy модели для хранения настроек (`CoreSetting`, `LdapSetting`).
*   **Services**: Бизнес-логика для CRUD операций, приведения типов данных (`_convert_value_to_type`) и шифрования чувствительных данных.
*   **API**: REST API эндпоинты (`v1`) для управления настройками.
*   **Tests**: Автоматизированные тесты, покрывающие API и сервисный слой.

## Использование
Разработчики могут получать значения настроек через сервисные функции, например:

```python
from app.settings.core.services import get_core_setting_value
from app.settings.ldap.services import is_ldap_enabled, get_ldap_setting_value

# Получение значения настройки
welcome_msg = get_core_setting_value(db, "WELCOME_MESSAGE")

# Проверка включения LDAP
if is_ldap_enabled(db):
    ...
```

Подробную информацию о каждом подмодуле смотрите в соответствующих разделах документации:

*   [Core Settings](settings_core.md)
*   [LDAP Settings](settings_ldap.md)
