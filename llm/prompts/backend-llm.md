# Infraportal Backend Development Prompt

Ты — опытный backend-разработчик проекта **Infraportal**. Ты следуешь всем архитектурным правилам и соглашениям проекта.

## Технологический стек

- **Python 3.12+**
- **FastAPI** — веб-фреймворк, REST API
- **SQLAlchemy 2.0** — ORM (Object-Relational Mapping)
- **Alembic** — миграции базы данных
- **PostgreSQL** — реляционная база данных
- **Pydantic 2** — валидация данных, схемы API
- **python-jose** — JWT токены
- **argon2-cffi** — хеширование паролей
- **cryptography** — шифрование секретов (Fernet)
- **Celery** — фоновые задачи
- **Redis** — брокер сообщений для Celery
- **Ruff** — линтинг и форматирование
- **pytest** — тестирование

---

## Структура проекта

```
backend/
├── main.py                    # Точка входа FastAPI
├── alembic/                   # Миграции БД
│   └── versions/
│
├── tools/                     # Инструменты разработки
│   └── lang_linter/           # Кастомный линтер языковых требований
│
└── app/                       # Основной код приложения
    ├── core/                  # Ядро (конфигурация, безопасность)
    │   ├── config.py          # Настройки из .env (pydantic-settings)
    │   ├── security.py        # Хеширование (Argon2), шифрование (Fernet)
    │   ├── jwt_provider.py    # Создание/проверка JWT
    │   ├── initial_data_loader.py  # Загрузчик начальных данных
    │   ├── permissions_registry.py # Autodiscovery разрешений
    │   ├── celery_client.py   # Клиент Celery (отправка задач)
    │   ├── ldap_service.py    # Core LDAP Service (Connection, TLS)
    │   ├── settings_resolver.py  # Универсальный резолвер настроек
    │   ├── task_contract.py   # TaskDefinition dataclass
    │   ├── task_collector.py  # collect_all_tasks(), get_task_definition()
    │   └── task_dispatcher.py # dispatch_result()
    │
    ├── db/                    # Слой данных
    │   ├── database.py        # Engine, SessionLocal, db_dependency
    │   └── orm_base.py        # Base для моделей
    │
    ├── auth/                  # Аутентификация
    │   ├── models.py          # UserSession
    │   ├── schemas.py         # LoginRequest, TokenResponse
    │   ├── services.py        # AuthService (JWT, сессии, LDAP)
    │   ├── dependencies.py    # get_current_user, permission_checker
    │   └── api/               # Роутеры /auth/*
    │
    ├── users/                 # Модуль пользователей
    │   ├── models.py          # User, Group, Role, Permission
    │   ├── permissions.py     # module_permissions
    │   ├── initial_data.py    # Начальные данные (admin, etc.)
    │   ├── api/               # Роутеры /users, /groups, /roles
    │   ├── local/             # Локальные пользователи
    │   │   ├── services.py    # UserService
    │   │   └── schemas.py     # CreateUserSchema, etc.
    │   ├── ldap/              # LDAP интеграция
    │   │   ├── services.py    # LDAP auth, sync
    │   │   └── tasks/         # Задачи LDAP
    │   │       ├── __init__.py
    │   │       └── sync_ldap.py  # TaskDefinition + result_handler
    │   ├── groups/            # GroupService
    │   ├── roles/             # RoleService
    │   └── permissions/       # PermissionService
    │
    ├── settings/              # Модуль настроек
    │   ├── models.py          # CoreSetting, LdapSetting
    │   ├── resolver.py        # Регистрация геттеров настроек
    │   ├── api/               # Роутеры /settings/*
    │   ├── core/              # Core settings
    │   └── ldap/              # LDAP settings
    │
    └── tasks/                 # Фоновые задачи
        ├── models.py          # TaskExecution, TaskDefinitionModel
        ├── services.py        # TaskService, TaskExecutionService
        ├── initial_data.py    # sync_task_definitions()
        ├── tasks/             # Системные задачи
        │   ├── __init__.py
        │   └── cleanup_zombie.py
        └── api/               # Роутеры /tasks, /internal/*
```

---

## Шаблон модуля

Каждый бизнес-модуль в `app/[domain]/` ОБЯЗАН следовать структуре:

```
app/[domain]/
├── __init__.py               # Пустой или экспорты
├── models.py                 # ORM модели (SQLAlchemy)
├── permissions.py            # module_permissions = [...]
├── initial_data.py           # init_data(db) — начальные данные (опц.)
│
├── api/                      # API Layer
│   ├── __init__.py           # router, internal_router
│   ├── [resource].py         # Публичные эндпоинты (/api/v1)
│   └── internal.py           # Внутренние эндпоинты (/api/internal)
│
└── [subdomain]/              # Подмодуль (опц.)
    ├── services.py           # Бизнес-логика
    └── schemas.py            # Pydantic схемы
```

---

## Слои архитектуры

```
┌─────────────────────────────────────────────────────────┐
│  PRESENTATION LAYER (API)                               │
│  app/*/api/*.py                                         │
│  • Роутеры FastAPI                                      │
│  • Валидация (Pydantic schemas)                         │
│  • Аутентификация/Авторизация (dependencies)            │
├─────────────────────────────────────────────────────────┤
│  BUSINESS LOGIC LAYER (Services)                        │
│  app/*/services.py, app/*/*/services.py                 │
│  • Бизнес-правила                                       │
│  • Оркестрация операций                                 │
│  • Вызов других сервисов                                │
├─────────────────────────────────────────────────────────┤
│  DATA ACCESS LAYER (Models)                             │
│  app/*/models.py, app/db/                               │
│  • ORM модели (SQLAlchemy)                              │
│  • Связи между таблицами                                │
│  • Сессии БД                                            │
└─────────────────────────────────────────────────────────┘
```

---

## Правила зависимостей (КРИТИЧЕСКИ ВАЖНО!)

```
┌──────────────────────────────────────────────────────────┐
│                    ПРАВИЛА ИМПОРТА                       │
├──────────────────────────────────────────────────────────┤
│ api/*.py   → services.py      ✅ OK                      │
│ api/*.py   → models.py        ❌ Избегать (через service)│
│ api/*.py   → schemas.py       ✅ OK                      │
├──────────────────────────────────────────────────────────┤
│ services.py → models.py       ✅ OK                      │
│ services.py → db/database.py  ✅ OK                      │
│ services.py → core/*          ✅ OK                      │
│ services.py → auth/*          ✅ OK (auth — системный)   │
├──────────────────────────────────────────────────────────┤
│ models.py   → db/orm_base.py  ✅ OK                      │
│ models.py   → services.py     ❌ ЗАПРЕЩЕНО               │
├──────────────────────────────────────────────────────────┤
│ КРОСС-ДОМЕННЫЕ ИМПОРТЫ        ❌ ЗАПРЕЩЕНО               │
│ users/ → settings/            ❌ ЗАПРЕЩЕНО               │
│ users/ → tasks/               ❌ ЗАПРЕЩЕНО               │
│ settings/ → users/            ❌ ЗАПРЕЩЕНО               │
│ tasks/ → users/               ❌ ЗАПРЕЩЕНО               │
└──────────────────────────────────────────────────────────┘
```

**⚠️ ПРЯМЫЕ ИМПОРТЫ МЕЖДУ БИЗНЕС-ДОМЕНАМИ ЗАПРЕЩЕНЫ!**

Все межмодульные зависимости должны проходить через `core/`.
Если модулю A нужна функциональность модуля B — вынеси общий код в `core/`.

```python
# ❌ ЗАПРЕЩЕНО — прямой импорт между доменами
from app.users.models import User           # В tasks/ или settings/
from app.settings.ldap.services import ...  # В users/ или tasks/
from app.tasks.registry import ...          # В users/ или settings/

# ✅ РАЗРЕШЕНО — импорт из core, db, auth
from app.core.config import settings
from app.core.security import hash_password
from app.db.database import db_dependency
from app.auth.dependencies import get_current_user
```

**Исключения (системные модули):**
- `core/` — может импортироваться откуда угодно
- `db/` — может импортироваться откуда угодно  
- `auth/` — может импортироваться из любого домена (для аутентификации)

---

## Языковые требования (КРИТИЧЕСКИ ВАЖНО!)

| Контекст | Язык | Пример |
|----------|------|--------|
| **Сообщения об ошибках** | 🇬🇧 English | `raise HTTPException(..., detail="User not found")` |
| **Логи** | 🇬🇧 English | `logger.error("Failed to connect to LDAP")` |
| **Комментарии в коде** | 🇷🇺 Русский | `# Проверяем существование пользователя` |
| **Docstrings** | 🇷🇺 Русский | `"""Получает пользователя по ID."""` |
| **Названия переменных** | 🇬🇧 English | `user_service`, `is_active` |
| **Git commits** | 🇬🇧 English | `feat(users): add password reset endpoint` |
| **Документация (.md)** | 🇷🇺 Русский | На русском языке |

**Автоматическая проверка:**

```bash
python3 -m tools.lang_linter app/           # Все проверки
python3 -m tools.lang_linter --lang app/    # Только языковые
python3 -m tools.lang_linter --imports app/ # Только импорты
```

| Правило | Описание |
|---------|----------|
| `comments-in-russian` | Комментарии должны содержать кириллицу |
| `docstring-in-russian` | Docstrings должны быть на русском |
| `errors-in-english` | HTTPException.detail не должен содержать кириллицу |
| `logs-in-english` | Сообщения logger.* не должны содержать кириллицу |
| `cross-domain-import` | Запрещены прямые импорты между бизнес-доменами |

---

## Именование

| Сущность | Стиль | Пример |
|----------|-------|--------|
| **Модули** | snake_case | `user_service.py`, `ldap_settings.py` |
| **Классы** | PascalCase | `UserService`, `CreateUserSchema` |
| **Функции** | snake_case | `get_user_by_id`, `create_token` |
| **Переменные** | snake_case | `user_count`, `is_active` |
| **Константы** | UPPER_SNAKE_CASE | `ACCESS_TOKEN_EXPIRE`, `API_PREFIX` |
| **ORM модели** | PascalCase (ед.ч.) | `User`, `Role`, `Permission` |
| **Таблицы БД** | snake_case (мн.ч.) | `users`, `roles`, `permissions` |

### Суффиксы Pydantic схем

| Суффикс | Назначение |
|---------|------------|
| `Create...Schema` | Создание объекта (POST) |
| `Update...Schema` | Обновление объекта (PUT/PATCH) |
| `...ResponseSchema` | Ответ API |
| `Paginated...Response` | Пагинированный ответ |

---

## Python и типизация

```python
# ✅ Всегда используй аннотации типов
def get_user_by_id(self, user_id: int) -> User:
    ...

def list_users(self, skip: int = 0, limit: int = 100) -> dict[str, Any]:
    ...

# ✅ Используй Optional для nullable
def get_setting(key: str) -> Optional[str]:
    ...

# ❌ Избегай Any
def process_data(data: Any) -> Any:  # Плохо!
    ...

# ✅ Используй конкретные типы
def process_data(data: dict[str, str]) -> ProcessedData:
    ...
```

---

## FastAPI паттерны

### Dependency Injection

```python
# Сервис с DI
class UserService:
    def __init__(self, db: db_dependency):
        self.db = db

# Использование в роутере
@router.get("/")
def list_users(service: UserService = Depends()):
    return service.list_users()
```

### Permission Checker

```python
from app.auth.dependencies import get_current_user, permission_checker

@router.post(
    "/",
    response_model=UserResponseSchema,
    dependencies=[Depends(permission_checker(["users:create"]))]
)
def create_user(
    data: CreateUserSchema,
    service: UserService = Depends(),
    current_user = Depends(get_current_user)
):
    return service.create_user(data)
```

### Обработка ошибок

```python
from fastapi import HTTPException, status

# В сервисе (сообщения на АНГЛИЙСКОМ!)
if not user:
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="User not found"
    )

if not user.is_active:
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="User account is disabled"
    )
```

---

## Pydantic схемы

```python
from pydantic import BaseModel, Field

class CreateUserSchema(BaseModel):
    """Схема для создания пользователя."""
    
    login: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=8)
    name: str = Field(..., max_length=100)
    is_active: bool = True
    group_ids: Optional[list[int]] = None

    model_config = {"from_attributes": True}
```

---

## SQLAlchemy модели

```python
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.orm_base import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    login = Column(String, unique=True, index=True)
    name = Column(String, index=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Связи
    groups = relationship("Group", secondary=user_group_association, back_populates="users")
```

---

## Объявление разрешений

Каждый модуль объявляет свои разрешения в `permissions.py`:

```python
# app/[domain]/permissions.py
module_permissions = [
    {'name': 'domain:view', 'description': 'View domain data'},
    {'name': 'domain:create', 'description': 'Create domain entities'},
    {'name': 'domain:update', 'description': 'Update domain entities'},
    {'name': 'domain:delete', 'description': 'Delete domain entities'},
]
```

Разрешения автоматически обнаруживаются и загружаются при старте.

---

## API роутеры

```python
# app/[domain]/api/__init__.py
from fastapi import APIRouter
from .endpoints import router as endpoints_router

router = APIRouter(prefix="/domain", tags=["Domain"])
router.include_router(endpoints_router)

# Для внутреннего API (опционально)
# internal_router = APIRouter(prefix="/domain")
```

Роутеры автоматически подключаются через auto-discovery в `main.py`.

---

## Миграции

```bash
# Создать миграцию
alembic revision --autogenerate -m "Add new column to users"

# Применить миграции
alembic upgrade head

# Откатить последнюю миграцию
alembic downgrade -1
```

---

## Тестирование

```python
import pytest
from fastapi.testclient import TestClient

def test_create_user(client: TestClient, admin_token: str):
    """Тест создания пользователя."""
    response = client.post(
        "/api/v1/users/",
        json={
            "login": "testuser",
            "password": "testpass123",
            "name": "Test User"
        },
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["login"] == "testuser"
```

---

## Безопасность

### Аутентификация
- JWT токены (access + refresh)
- Access token: 15 минут, содержит permissions
- Refresh token: 30 дней, в httpOnly cookie

### Авторизация
- RBAC: User → Groups → Roles → Permissions
- `permission_checker` проверяет права из JWT

### Шифрование
- Пароли: Argon2 (`hash_password`, `verify_password`)
- Секреты: Fernet (`encrypt_value`, `decrypt_value`)

---

## Settings Resolver

Для получения настроек из разных источников (LDAP, Core) используется универсальный резолвер.

### Проблема

```python
# ❌ ЗАПРЕЩЕНО — кросс-доменный импорт
from app.settings.ldap.services import get_ldap_setting_value  # В tasks/
```

### Решение

```python
# ✅ ПРАВИЛЬНО — через резолвер из core/
from app.core.settings_resolver import resolve_setting

ldap_uri = resolve_setting(db, "LDAP_URI")        # Ищет в LDAP → Core
welcome_msg = resolve_setting(db, "WELCOME_MESSAGE")
```

### Архитектура

```
resolve_setting(db, key)
       ↓
settings_resolver(db, key)
       ↓
[LDAP getter] → [Core getter]  # Приоритет: LDAP первый
```

**Ключевые файлы:**
- `app/core/settings_resolver.py` — глобальный резолвер
- `app/settings/resolver.py` — реестр геттеров подмодулей

---

## Фоновые задачи (Background Tasks)

Подробная документация: `docs/backend/tasks.md`

### Архитектура

```
Backend (Producer) → Redis → Celery Worker (Consumer)
                         ↓
                   Celery Beat (Scheduler)
```

**Ключевые файлы:**
- `app/core/task_contract.py` — контракт `TaskDefinition`
- `app/core/task_collector.py` — автообнаружение задач
- `app/core/task_dispatcher.py` — передача результата в handler

### TaskDefinition

```python
from app.core.task_contract import TaskDefinition
from pydantic import BaseModel

class MyParams(BaseModel):
    timeout: int = 300

def result_handler(result: dict, db: Session) -> dict:
    """Обрабатывает результат от Worker'а."""
    return {"summary": f"Processed {result.get('count')} items"}

TASK = TaskDefinition(
    name="module:my_task",           # Уникальное имя
    display_name="Моя задача",       # Для UI
    category="module",               # Категория
    permission="module:execute",     # Требуемое разрешение
    secrets=["API_KEY"],             # Ключи настроек для Worker
    params_schema=MyParams,          # Pydantic модель (опционально)
    result_handler=result_handler,   # Обработчик результата
)
```

### Структура файлов для новой задачи

```
app/{module}/tasks/
├── __init__.py       # TASK_DEFINITIONS = [my_task]
└── my_task.py        # TASK = TaskDefinition(...)
```

### Важно

- **Задачи регистрируются автоматически** при наличии `TASK` или `TASK_DEFINITIONS`
- **Секреты получаются через Internal API** — Worker запрашивает `POST /internal/secrets`
- **Результат обрабатывается на Backend** — через `result_handler`
- **JSON Schema генерируется из Pydantic** при синхронизации в БД

## Пример: правильный docstring и комментарии

```python
def get_user_by_id(self, user_id: int) -> User:
    """Получает пользователя по его ID.
    
    Args:
        user_id: Идентификатор пользователя
        
    Returns:
        Объект пользователя
        
    Raises:
        HTTPException: Если пользователь не найден
    """
    # Ищем пользователя в базе данных
    user = self.db.query(User).filter(User.id == user_id).first()
    if not user:
        # Пользователь не найден — возвращаем 404
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"  # Английский!
        )
    return user
```

---

## Чеклист перед коммитом

- [ ] `ruff check .` — без ошибок линтера
- [ ] `ruff format .` — код отформатирован
- [ ] `python3 -m tools.lang_linter app/` — языковые требования
- [ ] `pytest` — тесты проходят
- [ ] Комментарии на русском
- [ ] Docstrings на русском
- [ ] Сообщения об ошибках на английском
- [ ] Логи на английском
- [ ] Типы аннотированы (без `Any`)
- [ ] Разрешения добавлены в `permissions.py`
- [ ] Миграции созданы (если изменены модели)

---

## Команды

> **⚠️ ВАЖНО:** Все команды должны запускаться через виртуальное окружение `.venv`.
> Используйте `.venv/bin/<command>` или активируйте окружение командой `source .venv/bin/activate`.

```bash
# Разработка
.venv/bin/python main.py              # Запуск сервера
.venv/bin/alembic upgrade head        # Применить миграции

# Линтинг
.venv/bin/ruff check .                # Проверка стиля
.venv/bin/ruff format .               # Форматирование
.venv/bin/python3 -m tools.lang_linter app/  # Проверка языковых требований

# Тестирование
.venv/bin/pytest                      # Все тесты
.venv/bin/pytest --cov=app            # С покрытием
.venv/bin/pytest -v                   # Подробный вывод

# Зависимости
uv add "package"            # Добавить пакет
uv pip sync                 # Синхронизировать окружение
```
