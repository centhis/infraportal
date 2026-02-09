# Обзор модуля Settings

## Введение

Модуль **Settings** (`backend/app/settings`) предназначен для централизованного управления конфигурацией приложения. Он позволяет хранить настройки в базе данных, изменять их через API без перезапуска сервисов и обеспечивает типизацию и безопасность данных.

## Архитектура

Модуль разделен на подмодули, соответствующие функциональным областям приложения:

*   **Core Settings (`/settings/core`)**: Основные настройки системы.
*   **LDAP Settings (`/settings/ldap`)**: Настройки интеграции с каталогом LDAP.

### Основные компоненты

| Компонент | Файл | Описание |
|-----------|------|----------|
| Models | `models.py` | SQLAlchemy модели (`CoreSetting`, `LdapSetting`) |
| Services | `core/services.py`, `ldap/services.py` | CRUD, приведение типов, шифрование |
| API | `api/` | REST эндпоинты `/settings/*` |
| Resolver | `resolver.py` | Регистрация геттеров настроек |

---

## Settings Resolver

Центральный механизм для получения настроек из разных источников без прямых импортов между модулями.

### Проблема (до рефакторинга)

```python
# ❌ ЗАПРЕЩЕНО — кросс-доменный импорт
from app.settings.ldap.services import get_ldap_setting_value
from app.settings.core.services import get_core_setting_value
```

### Решение — Settings Resolver

```
┌─────────────┐     ┌─────────────────────────────┐
│   tasks/    │────▶│ core/settings_resolver.py   │
│   api/      │     │   resolve_setting(db, key)  │
│ internal.py │     └─────────────────────────────┘
└─────────────┘                   │
                                  ▼
                    ┌─────────────────────────────┐
                    │   settings/resolver.py      │
                    │   settings_resolver()       │
                    └─────────────────────────────┘
                           │            │
                    ┌──────┴──────┬─────┴──────┐
                    ▼             ▼            ▼
              ┌─────────┐   ┌─────────┐   ┌─────────┐
              │  LDAP   │   │  Core   │   │ Future  │
              │ getter  │   │ getter  │   │ modules │
              └─────────┘   └─────────┘   └─────────┘
```

### Файлы

| Файл | Назначение |
|------|------------|
| `app/core/settings_resolver.py` | Глобальный резолвер для всех модулей |
| `app/settings/resolver.py` | Резолвер внутри модуля settings |
| `app/settings/__init__.py` | Регистрация резолвера при импорте |

### Код

**app/core/settings_resolver.py:**
```python
from typing import Protocol
from sqlalchemy.orm import Session

class SettingResolver(Protocol):
    def __call__(self, db: Session, key: str) -> Any | None: ...

_resolvers: list[SettingResolver] = []

def register_resolver(resolver: SettingResolver):
    """Регистрирует функцию для разрешения настроек."""
    _resolvers.append(resolver)

def resolve_setting(db: Session, key: str) -> Any | None:
    """Получает значение настройки через зарегистрированные резолверы."""
    for resolver in _resolvers:
        val = resolver(db, key)
        if val is not None:
            return val
    return None
```

**app/settings/resolver.py:**
```python
_setting_getters: list[SettingGetter] = []

def register_setting_getter(getter: SettingGetter):
    """Регистрирует геттер подмодуля. LDAP добавляется в начало для приоритета."""
    _setting_getters.insert(0, getter)

def settings_resolver(db: Session, key: str) -> Any | None:
    """Итерируется по геттерам: LDAP → Core."""
    for getter in _setting_getters:
        val = getter(db, key)
        if val is not None:
            return val
    return None
```

### Использование

```python
from app.core.settings_resolver import resolve_setting

# Получение настройки из любого модуля (LDAP, Core, etc.)
ldap_uri = resolve_setting(db, "LDAP_URI")
welcome_msg = resolve_setting(db, "WELCOME_MESSAGE")
```

### Приоритет геттеров

1. **LDAP Settings** — специализированные настройки
2. **Core Settings** — fallback для общих настроек

При добавлении нового подмодуля (например, `mail`) его геттер автоматически регистрируется при импорте.

---

## Прямое использование (внутри модуля)

Для получения настроек **внутри самого модуля settings** можно использовать прямые импорты:

```python
from app.settings.core.services import get_core_setting_value
from app.settings.ldap.services import is_ldap_enabled, get_ldap_setting_value

# Получение значения настройки
welcome_msg = get_core_setting_value(db, "WELCOME_MESSAGE")

# Проверка включения LDAP
if is_ldap_enabled(db):
    ldap_uri = get_ldap_setting_value(db, "LDAP_URI")
```

---

## Добавление нового подмодуля настроек

1. Создать структуру `app/settings/{module}/`
2. Реализовать `services.py` с функцией `get_{module}_setting_value(db, key)`
3. Зарегистрировать геттер в `app/settings/{module}/__init__.py`:

```python
from app.settings.resolver import register_setting_getter
from .services import get_mail_setting_value

register_setting_getter(get_mail_setting_value)
```

4. Добавить импорт в `app/settings/__init__.py`:

```python
from . import core, ldap, mail  # Новый модуль
```

---

## Смотрите также

*   [Core Settings](settings_core.md)
*   [LDAP Settings](settings_ldap.md)
