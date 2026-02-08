# Руководство Разработчика Backend

Это руководство содержит правила и соглашения для разработки бэкенда Infraportal.

## Содержание

1. [Настройка окружения](#1-настройка-окружения)
2. [Структура кода](#2-структура-кода)
3. [Стиль кода](#3-стиль-кода)
4. [Языковые требования](#4-языковые-требования)
5. [Именование](#5-именование)
6. [Python и типизация](#6-python-и-типизация)
7. [FastAPI паттерны](#7-fastapi-паттерны)
8. [SQLAlchemy и БД](#8-sqlalchemy-и-бд)
9. [Тестирование](#9-тестирование)
10. [Чеклист перед коммитом](#10-чеклист-перед-коммитом)

---

## 1. Настройка окружения

### Установка uv

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

### Создание виртуального окружения

```bash
cd backend
uv venv
source .venv/bin/activate
```

### Установка зависимостей

```bash
uv pip sync
```

### Добавление зависимости

```bash
uv add "package-name==1.2.3"
```

### Запуск сервера

```bash
.venv/bin/python main.py
# или
.venv/bin/uvicorn main:app --reload --port 9000
```

---

## 2. Структура кода

### Создание нового модуля

```bash
mkdir -p app/new_module/{api,local}
touch app/new_module/__init__.py
touch app/new_module/models.py
touch app/new_module/permissions.py
touch app/new_module/api/__init__.py
touch app/new_module/api/endpoints.py
touch app/new_module/local/services.py
touch app/new_module/local/schemas.py
```

### Минимальный permissions.py

```python
# app/new_module/permissions.py
module_permissions = [
    {'name': 'new_module:view', 'description': 'View new module data'},
    {'name': 'new_module:edit', 'description': 'Edit new module data'},
]
```

### Минимальный api/__init__.py

```python
# app/new_module/api/__init__.py
from fastapi import APIRouter
from .endpoints import router as endpoints_router

router = APIRouter(prefix="/new_module", tags=["New Module"])
router.include_router(endpoints_router)

# Для внутреннего API (опционально)
# internal_router = APIRouter(prefix="/new_module")
```

---

## 3. Стиль кода

### Форматирование

- Используй **Ruff** для линтинга и форматирования
- Максимальная длина строки: **100 символов**
- Отступы: **4 пробела**

```bash
# Проверка
.venv/bin/ruff check .

# Форматирование
.venv/bin/ruff format .
```

### Импорты

Порядок импортов (Ruff сортирует автоматически):

```python
# 1. Стандартная библиотека
from datetime import datetime
from typing import List, Optional

# 2. Сторонние библиотеки
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import Column, Integer, String

# 3. Локальные импорты (абсолютные)
from app.db.database import db_dependency
from app.core.security import hash_password
```

### Правила кросс-доменных импортов

> [!IMPORTANT]
> **Прямые импорты между бизнес-доменами ЗАПРЕЩЕНЫ!**
> 
> Все межмодульные зависимости должны проходить через `core/`.

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

**Если нужна общая функциональность — вынеси её в `core/`.**

---

## 4. Языковые требования

> [!IMPORTANT]
> Эти правила являются ОБЯЗАТЕЛЬНЫМИ для всего кода бэкенда.

| Контекст | Язык | Пример |
|----------|------|--------|
| **Сообщения об ошибках** | 🇬🇧 English | `raise HTTPException(..., detail="User not found")` |
| **Логи** | 🇬🇧 English | `logger.error("Failed to connect to LDAP")` |
| **Комментарии в коде** | 🇷🇺 Русский | `# Проверяем существование пользователя` |
| **Docstrings** | 🇷🇺 Русский | `"""Получает пользователя по ID."""` |
| **Названия переменных** | 🇬🇧 English | `user_service`, `is_active` |
| **Git commits** | 🇬🇧 English | `feat(users): add password reset endpoint` |
| **Документация (.md)** | 🇷🇺 Русский | Этот файл |

### Автоматическая проверка (lang-lint)

Для проверки языковых и архитектурных требований используется кастомный линтер:

```bash
# Все проверки (языковые + импорты)
.venv/bin/python3 -m tools.lang_linter app/

# Только языковые требования
.venv/bin/python3 -m tools.lang_linter --lang app/

# Только проверка кросс-доменных импортов
.venv/bin/python3 -m tools.lang_linter --imports app/

# Тихий режим
.venv/bin/python3 -m tools.lang_linter -q app/
```

**Проверяемые правила:**

| Правило | Описание |
|---------|----------|
| `comments-in-russian` | Комментарии должны содержать кириллицу |
| `docstring-in-russian` | Docstrings должны быть на русском |
| `errors-in-english` | HTTPException.detail и raise не должны содержать кириллицу |
| `logs-in-english` | Сообщения logger.* не должны содержать кириллицу |
| `cross-domain-import` | Запрещены прямые импорты между бизнес-доменами |

### Примеры

```python
# ✅ Правильно
def get_user_by_id(user_id: int) -> User:
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

```python
# ❌ Неправильно
def get_user_by_id(user_id: int) -> User:
    """Gets user by ID."""  # Docstring должен быть на русском!
    # Find user in database  # Комментарий должен быть на русском!
    user = self.db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Пользователь не найден"  # Ошибка должна быть на английском!
        )
    return user
```

---

## 5. Именование

| Сущность | Стиль | Пример |
|----------|-------|--------|
| **Модули** | snake_case | `user_service.py`, `ldap_settings.py` |
| **Классы** | PascalCase | `UserService`, `CreateUserSchema` |
| **Функции** | snake_case | `get_user_by_id`, `create_token` |
| **Переменные** | snake_case | `user_count`, `is_active` |
| **Константы** | UPPER_SNAKE_CASE | `ACCESS_TOKEN_EXPIRE`, `API_PREFIX` |
| **ORM модели** | PascalCase (единственное число) | `User`, `Role`, `Permission` |
| **Таблицы БД** | snake_case (множественное число) | `users`, `roles`, `permissions` |
| **Pydantic схемы** | PascalCase + суффикс | `CreateUserSchema`, `UserResponseSchema` |

### Суффиксы схем

| Суффикс | Назначение |
|---------|------------|
| `Create...Schema` | Создание объекта (POST) |
| `Update...Schema` | Обновление объекта (PUT/PATCH) |
| `...ResponseSchema` | Ответ API |
| `Paginated...Response` | Пагинированный ответ |

---

## 6. Python и типизация

### Аннотации типов

```python
# ✅ Всегда используй аннотации
def get_user_by_id(self, user_id: int) -> User:
    ...

def list_users(self, skip: int = 0, limit: int = 100) -> dict[str, Any]:
    ...

# ✅ Используй Optional для nullable
def get_setting(key: str) -> Optional[str]:
    ...
```

### Избегай Any

```python
# ❌ Избегай
def process_data(data: Any) -> Any:
    ...

# ✅ Используй конкретные типы или generics
def process_data(data: dict[str, str]) -> ProcessedData:
    ...
```

### Pydantic модели

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

## 7. FastAPI паттерны

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

# В сервисе
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

## 8. SQLAlchemy и БД

### Модели

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

### Запросы

```python
# Простой запрос
user = self.db.query(User).filter(User.id == user_id).first()

# С eager loading
from sqlalchemy.orm import joinedload

users = self.db.query(User).options(joinedload(User.groups)).all()

# Select стиль (предпочтительно для новых запросов)
from sqlalchemy import select

stmt = select(User).where(User.id.in_(user_ids))
users = self.db.execute(stmt).scalars().all()
```

### Миграции

```bash
# Создать миграцию
.venv/bin/alembic revision --autogenerate -m "Add new column to users"

# Применить миграции
.venv/bin/alembic upgrade head

# Откатить последнюю миграцию
.venv/bin/alembic downgrade -1
```

---

## 9. Тестирование

### Структура тестов

```
tests/
├── conftest.py          # Фикстуры (db, client, etc.)
├── test_auth.py         # Тесты аутентификации
├── test_users.py        # Тесты пользователей
└── test_settings.py     # Тесты настроек
```

### Запуск тестов

```bash
# Все тесты
.venv/bin/pytest

# С покрытием
.venv/bin/pytest --cov=app

# Один файл
.venv/bin/pytest tests/test_users.py

# Один тест
.venv/bin/pytest tests/test_users.py::test_create_user
```

### Пример теста

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

## 10. Чеклист перед коммитом

- [ ] `.venv/bin/ruff check .` — без ошибок линтера
- [ ] `.venv/bin/ruff format .` — код отформатирован
- [ ] `.venv/bin/python3 -m tools.lang_linter app/` — языковые требования соблюдены
- [ ] `.venv/bin/pytest` — тесты проходят
- [ ] Комментарии на русском
- [ ] Сообщения об ошибках на английском
- [ ] Логи на английском
- [ ] Docstrings на русском
- [ ] Типы аннотированы (без `Any`)
- [ ] Новые разрешения добавлены в `permissions.py`
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

