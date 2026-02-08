# План Рефакторинга Архитектуры Задач

## Цель

Перейти от текущей архитектуры с дублированием определений к единой системе:
- **Backend** хранит все метаданные задач в БД (`task_definitions`)
- **Worker** получает секреты через API, выполняет handler, возвращает результат
- **Модули** определяют свои задачи в `tasks/` папке субмодуля

---

## Текущее Состояние

### Файлы с определениями задач

| Файл | Содержимое |
|------|-----------|
| `backend/app/users/ldap/tasks.py` | `TASK_DEFINITIONS = [("users:sync_ldap", SyncLdapParams, "users:update", None)]` |
| `backend/app/tasks/tasks.py` | `TASK_DEFINITIONS = [("system:cleanup_zombie_tasks", CleanupZombieTasksParams, "tasks:cleanup")]` |

### Ключевые файлы системы

| Файл | Назначение |
|------|-----------|
| `backend/app/tasks/registry.py` | `TASK_REGISTRY` dict, `autodiscover_tasks()`, `TaskDefinition` dataclass |
| `backend/app/tasks/api/internal.py` | `/secrets` с hardcoded if-elif, `/task_execution`, `/tasks/{id}` |
| `backend/app/tasks/services.py` | `TaskExecutionService` — создание/обновление executions |
| `celery_worker/tasks.py` | `dispatch_task()` — основной dispatcher |
| `celery_worker/handlers/users/sync_ldap.py` | Handler синхронизации LDAP |

---

## Целевая Структура

```
backend/app/
├── core/
│   ├── task_contract.py      # TaskDefinition dataclass
│   ├── task_collector.py     # collect_all_tasks()
│   └── task_dispatcher.py    # dispatch_result()
├── users/
│   └── ldap/
│       └── tasks/
│           ├── __init__.py   # TASK_DEFINITIONS = [sync_ldap]
│           └── sync_ldap.py  # TASK + result_handler
└── tasks/
    ├── models.py             # TaskDefinitionModel (новая модель)
    ├── tasks/
    │   ├── __init__.py
    │   └── cleanup_zombie.py
    └── api/
        └── internal.py       # Рефакторинг secrets
```

---

## Задачи

---

### Задача 1.1: Создание TaskDefinition Dataclass

| Поле | Значение |
|------|----------|
| **Статус** | `[ ]` Не начата |
| **Приоритет** | Высокий |
| **Зависимости** | — |

**Что есть сейчас:**

Файл `backend/app/tasks/registry.py` содержит:
```python
@dataclass
class TaskDefinition:
    name: str
    params_schema: type[BaseModel]
    permission: str | None
    context_loader: Callable[[Session], dict[str, Any]] | None = None
```

**Что нужно сделать:**

1. Создать новый файл `backend/app/core/task_contract.py`
2. Перенести и расширить `TaskDefinition`:
   - Добавить `display_name: str`
   - Добавить `category: str`
   - Добавить `secrets: list[str]`
   - Добавить `result_handler: Callable[[dict, Session], dict] | None`
   - Переименовать `params_schema` → `params_schema: dict | None` (JSON Schema вместо Pydantic)
3. Удалить старый `TaskDefinition` из `registry.py` (в задаче 8.1)

**Файлы:**

| Действие | Путь |
|----------|------|
| CREATE | `backend/app/core/task_contract.py` |

**Код для создания:**

```python
# backend/app/core/task_contract.py
from dataclasses import dataclass, field
from typing import Callable, Any

@dataclass
class TaskDefinition:
    """Контракт определения задачи."""
    name: str                           # "users:sync_ldap"
    display_name: str                   # "Синхронизация LDAP"
    category: str                       # "users"
    permission: str                     # "users:update"
    secrets: list[str] = field(default_factory=list)
    params_schema: dict | None = None   # JSON Schema
    result_handler: Callable[[dict, Any], dict] | None = None
```

**Ожидаемый результат:**

- Файл создан
- Импорт `from app.core.task_contract import TaskDefinition` работает
- Тесты не падают (пока не используется)

---

### Задача 1.2: Создание Task Collector

| Поле | Значение |
|------|----------|
| **Статус** | `[ ]` Не начата |
| **Приоритет** | Высокий |
| **Зависимости** | 1.1 |

**Что есть сейчас:**

Файл `backend/app/tasks/registry.py` содержит `autodiscover_tasks()`:
```python
def autodiscover_tasks(package_name: str = "app"):
    for _, module_name, is_pkg in pkgutil.walk_packages(...):
        if module_name.endswith(".tasks"):
            module = importlib.import_module(module_name)
            if hasattr(module, "TASK_DEFINITIONS"):
                for task_def_tuple in module.TASK_DEFINITIONS:
                    # ... регистрация в TASK_REGISTRY
```

**Что нужно сделать:**

1. Создать `backend/app/core/task_collector.py`
2. Реализовать `collect_all_tasks()` — возвращает `list[TaskDefinition]`
3. Реализовать `get_task_definition(name: str)` — возвращает задачу по имени
4. Искать `TASK_DEFINITIONS` в субмодулях: `users.ldap.tasks`, `tasks.tasks` и т.д.

**Файлы:**

| Действие | Путь |
|----------|------|
| CREATE | `backend/app/core/task_collector.py` |

**Код для создания:**

```python
# backend/app/core/task_collector.py
import importlib
import pkgutil
from app.core.task_contract import TaskDefinition

_task_cache: dict[str, TaskDefinition] = {}

def collect_all_tasks() -> list[TaskDefinition]:
    """Собирает все задачи из субмодулей."""
    if _task_cache:
        return list(_task_cache.values())
    
    # Список путей для поиска tasks/
    task_modules = [
        "app.users.ldap.tasks",
        "app.tasks.tasks",
        # Добавить другие по мере появления
    ]
    
    for module_path in task_modules:
        try:
            module = importlib.import_module(module_path)
            for task in getattr(module, "TASK_DEFINITIONS", []):
                if task.name not in _task_cache:
                    _task_cache[task.name] = task
        except ImportError:
            continue
    
    return list(_task_cache.values())

def get_task_definition(name: str) -> TaskDefinition | None:
    """Возвращает определение задачи по имени."""
    if not _task_cache:
        collect_all_tasks()
    return _task_cache.get(name)
```

**Ожидаемый результат:**

- `collect_all_tasks()` возвращает все зарегистрированные задачи
- `get_task_definition("users:sync_ldap")` возвращает задачу

---

### Задача 1.3: Создание Result Dispatcher

| Поле | Значение |
|------|----------|
| **Статус** | `[ ]` Не начата |
| **Приоритет** | Высокий |
| **Зависимости** | 1.2 |

**Что есть сейчас:**

Результат задачи обрабатывается в worker напрямую. Нет универсального механизма.

**Что нужно сделать:**

1. Создать `backend/app/core/task_dispatcher.py`
2. Реализовать `dispatch_result(db, task_type, result)` — вызывает `result_handler` задачи

**Файлы:**

| Действие | Путь |
|----------|------|
| CREATE | `backend/app/core/task_dispatcher.py` |

**Код для создания:**

```python
# backend/app/core/task_dispatcher.py
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
```

**Ожидаемый результат:**

- `dispatch_result(db, "users:sync_ldap", {...})` вызывает handler из `users.ldap.tasks.sync_ldap`

---

### Задача 2.1: Модель TaskDefinitionModel

| Поле | Значение |
|------|----------|
| **Статус** | `[ ]` Не начата |
| **Приоритет** | Высокий |
| **Зависимости** | — |

**Что есть сейчас:**

Метаданные задач хранятся только в коде. В БД есть только `task_executions` и `periodic_tasks`.

**Что нужно сделать:**

1. Добавить модель `TaskDefinitionModel` в `backend/app/tasks/models.py`
2. Таблица `task_definitions` для хранения метаданных

**Файлы:**

| Действие | Путь |
|----------|------|
| MODIFY | `backend/app/tasks/models.py` |

**Код для добавления:**

```python
# Добавить в backend/app/tasks/models.py

class TaskDefinitionModel(Base):
    """Метаданные задач в БД."""
    __tablename__ = "task_definitions"
    
    name = Column(String, primary_key=True)  # "users:sync_ldap"
    display_name = Column(String, nullable=False)
    category = Column(String, nullable=False)
    permission = Column(String, nullable=True)
    params_schema = Column(JSON, nullable=True)
    secrets = Column(ARRAY(String), default=[])
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
```

**Ожидаемый результат:**

- Модель добавлена
- Готова к миграции

---

### Задача 2.2: Миграция task_definitions

| Поле | Значение |
|------|----------|
| **Статус** | `[ ]` Не начата |
| **Приоритет** | Высокий |
| **Зависимости** | 2.1 |

**Что нужно сделать:**

1. Создать Alembic миграцию для таблицы `task_definitions`
2. Применить миграцию

**Файлы:**

| Действие | Путь |
|----------|------|
| CREATE | `backend/alembic/versions/xxxx_create_task_definitions.py` |

**Команды:**

```bash
cd backend
alembic revision --autogenerate -m "create task_definitions table"
alembic upgrade head
```

**Ожидаемый результат:**

- Таблица `task_definitions` существует в БД
- `\d task_definitions` показывает все колонки

---

### Задача 3.1: Синхронизация в initial_data

| Поле | Значение |
|------|----------|
| **Статус** | `[ ]` Не начата |
| **Приоритет** | Высокий |
| **Зависимости** | 1.2, 2.2 |

**Что есть сейчас:**

Файл `backend/app/tasks/initial_data.py` создаёт `PeriodicTask` для расписания.

**Что нужно сделать:**

1. Добавить функцию `sync_task_definitions(db)` в `initial_data.py`
2. Вызывать при старте приложения
3. Upsert из `collect_all_tasks()` в таблицу `task_definitions`

**Файлы:**

| Действие | Путь |
|----------|------|
| MODIFY | `backend/app/tasks/initial_data.py` |

**Код для добавления:**

```python
from app.core.task_collector import collect_all_tasks
from app.tasks.models import TaskDefinitionModel

def sync_task_definitions(db: Session):
    """Синхронизирует определения задач из кода в БД."""
    for task in collect_all_tasks():
        existing = db.query(TaskDefinitionModel).filter_by(name=task.name).first()
        if existing:
            existing.display_name = task.display_name
            existing.category = task.category
            existing.permission = task.permission
            existing.secrets = task.secrets
            existing.params_schema = task.params_schema
        else:
            db.add(TaskDefinitionModel(
                name=task.name,
                display_name=task.display_name,
                category=task.category,
                permission=task.permission,
                secrets=task.secrets,
                params_schema=task.params_schema,
            ))
    db.commit()
```

**Ожидаемый результат:**

- При старте backend записи в `task_definitions` синхронизируются с кодом

---

### Задача 4.1: Рефакторинг get_task_secrets

| Поле | Значение |
|------|----------|
| **Статус** | `[ ]` Не начата |
| **Приоритет** | Высокий |
| **Зависимости** | 3.1 |

**Что есть сейчас:**

Файл `backend/app/tasks/api/internal.py` строки 29-41:
```python
if request.task_type == "users:sync_ldap":
    secrets["LDAP_URI"] = get_ldap_setting_value(db, "LDAP_URI")
    secrets["LDAP_BASE_DN"] = get_ldap_setting_value(db, "LDAP_BASE_DN")
    # ... ещё 4 строки
```

**Что нужно сделать:**

1. Убрать hardcoded `if request.task_type == "..."` 
2. Читать список секретов из `task_definitions.secrets`
3. Получать значения через универсальный `get_setting_value()`

**Файлы:**

| Действие | Путь |
|----------|------|
| MODIFY | `backend/app/tasks/api/internal.py` |

**Код замены:**

```python
@router.post("/secrets", dependencies=[Depends(get_worker_api_key)])
def get_task_secrets(request: SecretsRequest, db: db_dependency):
    """Возвращает секреты для задачи по её типу."""
    from app.tasks.models import TaskDefinitionModel
    from app.settings.services import get_setting_value
    
    task_def = db.query(TaskDefinitionModel).filter_by(name=request.task_type).first()
    if not task_def:
        return {"secrets": {}}
    
    secrets = {}
    for key in task_def.secrets or []:
        value = get_setting_value(db, key)
        if value is not None:
            secrets[key] = value
    
    return {"secrets": secrets}
```

**Ожидаемый результат:**

- Нет hardcoded if-elif
- Секреты определяются в `task.secrets` массиве

---

### Задача 4.2: Endpoint для результата

| Поле | Значение |
|------|----------|
| **Статус** | `[ ]` Не начата |
| **Приоритет** | Высокий |
| **Зависимости** | 1.3 |

**Что есть сейчас:**

Worker не отправляет результат через API. Статус обновляется напрямую.

**Что нужно сделать:**

1. Добавить `POST /internal/tasks/{id}/result` в `internal.py`
2. Вызывать `dispatch_result()` для передачи в модуль
3. Обновлять статус на SUCCESS

**Файлы:**

| Действие | Путь |
|----------|------|
| MODIFY | `backend/app/tasks/api/internal.py` |

**Код для добавления:**

```python
from app.core.task_dispatcher import dispatch_result

@router.post("/tasks/{execution_id}/result", dependencies=[Depends(get_worker_api_key)])
def receive_task_result(
    execution_id: UUID,
    result: dict = Body(...),
    db: db_dependency,
    execution_service: TaskExecutionService = Depends(),
):
    """Воркер отправляет результат выполнения."""
    execution = execution_service.get_execution(execution_id)
    if not execution:
        raise HTTPException(404, "Execution not found")
    
    try:
        module_result = dispatch_result(db, execution.task_name, result)
    except Exception as e:
        execution_service.update_status(execution_id, ExecutionStatus.FAILURE, {"error": str(e)})
        raise
    
    execution_service.update_status(
        execution_id, 
        ExecutionStatus.SUCCESS, 
        {"worker_result": result, "module_result": module_result}
    )
    
    return {"status": "ok"}
```

**Ожидаемый результат:**

- Worker отправляет результат на `/internal/tasks/{id}/result`
- Backend вызывает `result_handler` модуля

---

### Задача 5.1: Рефакторинг users/ldap/tasks

| Поле | Значение |
|------|----------|
| **Статус** | `[ ]` Не начата |
| **Приоритет** | Высокий |
| **Зависимости** | 1.1 |

**Что есть сейчас:**

Файл `backend/app/users/ldap/tasks.py`:
```python
class SyncLdapParams(BaseModel):
    pass

TASK_DEFINITIONS = [("users:sync_ldap", SyncLdapParams, "users:update", None)]
```

**Что нужно сделать:**

1. Создать папку `backend/app/users/ldap/tasks/`
2. Создать `__init__.py` и `sync_ldap.py`
3. Перенести определение в новый формат с `result_handler`
4. Удалить старый `tasks.py`

**Файлы:**

| Действие | Путь |
|----------|------|
| CREATE | `backend/app/users/ldap/tasks/__init__.py` |
| CREATE | `backend/app/users/ldap/tasks/sync_ldap.py` |
| DELETE | `backend/app/users/ldap/tasks.py` |

**Код sync_ldap.py:**

```python
# backend/app/users/ldap/tasks/sync_ldap.py
from sqlalchemy.orm import Session
from app.core.task_contract import TaskDefinition
from app.users.models import User

def result_handler(result: dict, db: Session) -> dict:
    """Обрабатывает результат синхронизации LDAP."""
    users_data = result.get("users", [])
    stats = {"created": 0, "updated": 0, "disabled": 0}
    
    ldap_usernames = set()
    for data in users_data:
        username = data.get("sAMAccountName") or data.get("uid")
        if not username:
            continue
        ldap_usernames.add(username)
        
        existing = db.query(User).filter_by(username=username).first()
        if existing:
            # Обновление существующего
            existing.email = data.get("mail")
            existing.display_name = data.get("displayName")
            stats["updated"] += 1
        else:
            # Создание нового
            db.add(User(
                username=username,
                email=data.get("mail"),
                display_name=data.get("displayName"),
                source="ldap",
                is_active=True,
            ))
            stats["created"] += 1
    
    # Деактивация отсутствующих
    stats["disabled"] = db.query(User).filter(
        User.source == "ldap",
        User.is_active == True,
        ~User.username.in_(ldap_usernames)
    ).update({"is_active": False}, synchronize_session=False)
    
    db.commit()
    return stats

TASK = TaskDefinition(
    name="users:sync_ldap",
    display_name="Синхронизация LDAP",
    category="users",
    permission="users:update",
    secrets=["LDAP_URI", "LDAP_BIND_DN", "LDAP_BIND_PASSWORD", 
             "LDAP_BASE_DN", "LDAP_USER_FILTER", "LDAP_TLS_VERIFY"],
    result_handler=result_handler,
)
```

**Код __init__.py:**

```python
# backend/app/users/ldap/tasks/__init__.py
from .sync_ldap import TASK as sync_ldap

TASK_DEFINITIONS = [sync_ldap]
```

**Ожидаемый результат:**

- Новая структура `users/ldap/tasks/`
- `result_handler` обрабатывает данные от воркера
- Старый файл удалён

---

### Задача 5.2: Рефакторинг tasks/tasks

| Поле | Значение |
|------|----------|
| **Статус** | `[ ]` Не начата |
| **Приоритет** | Средний |
| **Зависимости** | 1.1 |

**Что есть сейчас:**

Файл `backend/app/tasks/tasks.py`:
```python
class CleanupZombieTasksParams(BaseModel):
    timeout_seconds: int = Field(default=300, ...)

TASK_DEFINITIONS = [("system:cleanup_zombie_tasks", CleanupZombieTasksParams, "tasks:cleanup")]
```

**Что нужно сделать:**

1. Создать папку `backend/app/tasks/tasks/`
2. Создать `__init__.py` и `cleanup_zombie.py`
3. Перенести в новый формат
4. Удалить старый `tasks.py`

**Файлы:**

| Действие | Путь |
|----------|------|
| CREATE | `backend/app/tasks/tasks/__init__.py` |
| CREATE | `backend/app/tasks/tasks/cleanup_zombie.py` |
| DELETE | `backend/app/tasks/tasks.py` |

**Ожидаемый результат:**

- Структура `tasks/tasks/` для системных задач

---

### Задача 6.1: Обновление dispatch_task в Worker

| Поле | Значение |
|------|----------|
| **Статус** | `[ ]` Не начата |
| **Приоритет** | Высокий |
| **Зависимости** | 4.2 |

**Что есть сейчас:**

Файл `celery_worker/tasks.py` — worker обновляет статус и выполняет handler.

**Что нужно сделать:**

1. После выполнения handler отправлять результат на `/internal/tasks/{id}/result`
2. Backend обработает результат через `dispatch_result()`

**Файлы:**

| Действие | Путь |
|----------|------|
| MODIFY | `celery_worker/tasks.py` |

**Код изменения:**

```python
# В dispatch_task после выполнения handler:
result = handler(execution_id=current_execution_id, secrets=secrets, **current_kwargs)

# Отправляем результат в Backend
httpx.post(
    f"{settings.BACKEND_INTERNAL_API_URL}/tasks/{current_execution_id}/result",
    json=result,
    headers={"X-API-Key": settings.CELERY_WORKER_API_KEY},
    timeout=30.0,
)
```

**Ожидаемый результат:**

- Worker отправляет результат через API
- Backend вызывает `result_handler` модуля

---

### Задача 8.1: Удаление старого registry.py

| Поле | Значение |
|------|----------|
| **Статус** | `[ ]` Не начата |
| **Приоритет** | Низкий |
| **Зависимости** | 5.1, 5.2, 6.1 |

**Что нужно сделать:**

1. Удалить или рефакторить `backend/app/tasks/registry.py`
2. Обновить импорты в `main.py`, `services.py`, тестах

**Файлы:**

| Действие | Путь |
|----------|------|
| DELETE | `backend/app/tasks/registry.py` |
| MODIFY | `backend/main.py` |
| MODIFY | `backend/app/tasks/services.py` |
| MODIFY | `backend/tests/test_tasks_*.py` |

**Ожидаемый результат:**

- Нет ссылок на `TASK_REGISTRY`
- Используется только `task_collector`

---

### Задача 9.1: Unit-тесты core

| Поле | Значение |
|------|----------|
| **Статус** | `[ ]` Не начата |
| **Приоритет** | Средний |
| **Зависимости** | 1.1, 1.2, 1.3 |

**Файлы:**

| Действие | Путь |
|----------|------|
| CREATE | `backend/tests/core/test_task_collector.py` |
| CREATE | `backend/tests/core/test_task_dispatcher.py` |

**Ожидаемый результат:**

- Тесты покрывают `collect_all_tasks()`, `get_task_definition()`, `dispatch_result()`

---

### Задача 10.1: Документация

| Поле | Значение |
|------|----------|
| **Статус** | `[ ]` Не начата |
| **Приоритет** | Средний |
| **Зависимости** | Все предыдущие |

**Файлы:**

| Действие | Путь |
|----------|------|
| CREATE | `docs/backend/tasks.md` |
| MODIFY | `llm/prompts/backend-llm.md` |

**Содержание docs/backend/tasks.md:**

- Архитектура задач
- Как добавить новую задачу
- Описание контракта TaskDefinition
- API reference

**Ожидаемый результат:**

- Документация актуальна
- AI-prompt обновлён

---

## Порядок Выполнения

```
1.1 → 1.2 → 1.3
2.1 → 2.2
     ↓
    3.1 → 4.1
         ↓
    4.2 → 6.1
         ↓
5.1, 5.2 → 8.1 → 9.1 → 10.1
```

---

## Легенда

| Статус | Описание |
|--------|----------|
| `[ ]` | Не начата |
| `[/]` | В процессе |
| `[x]` | Завершена |
