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
| **Статус** | `[x]` Завершена |
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

- [x] Файл создан
- [x] Импорт `from app.core.task_contract import TaskDefinition` работает
- [x] Тесты не падают (пока не используется)

---

### Задача 1.2: Создание Task Collector

| Поле | Значение |
|------|----------|
| **Статус** | `[x]` Завершена |
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

- [x] `collect_all_tasks()` возвращает все зарегистрированные задачи
- [x] `get_task_definition("users:sync_ldap")` возвращает задачу

---

### Задача 1.3: Создание Result Dispatcher

| Поле | Значение |
|------|----------|
| **Статус** | `[x]` Завершена |
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

- [x] `dispatch_result(db, "users:sync_ldap", {...})` вызывает handler из `users.ldap.tasks.sync_ldap`

---

### Задача 2.1: Модель TaskDefinitionModel

| Поле | Значение |
|------|----------|
| **Статус** | `[x]` Завершена |
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

- [x] Модель добавлена
- [x] Готова к миграции

---

### Задача 2.2: Миграция task_definitions

| Поле | Значение |
|------|----------|
| **Статус** | `[x]` Завершена |
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

- [x] Таблица `task_definitions` существует в БД
- [x] `\d task_definitions` показывает все колонки

---

### Задача 3.1: Синхронизация в initial_data

| Поле | Значение |
|------|----------|
| **Статус** | `[x]` Завершена |
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

- [x] При старте backend записи в `task_definitions` синхронизируются с кодом

---

### Задача 4.1: Рефакторинг get_task_secrets

| Поле | Значение |
|------|----------|
| **Статус** | `[x]` Завершена |
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

- [x] Нет hardcoded if-elif
- [x] Секреты определяются в `task.secrets` массиве

---

### Задача 4.2: Endpoint для результата

| Поле | Значение |
|------|----------|
| **Статус** | `[x]` Завершена |
| **Приоритет** | Высокий |
| **Зависимости** | 1.3 |

**Что есть сейчас:**

Worker не отправляет результат через API. Статус обновляется напрямую.

**Что нужно сделать:**

1. Реализовать Endpoint `POST /internal/tasks/{execution_id}/result`
2. Использует `dispatch_result` для передачи результата в модуль
3. Обновляет статус выполнения на SUCCESS (или переданный статус)

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

- [x] Worker отправляет результат на `/internal/tasks/{id}/result`
- [x] Backend вызывает `result_handler` модуля

---

### Задача 5.1: Рефакторинг users/ldap/tasks

| Поле | Значение |
|------|----------|
| **Статус** | `[x]` Завершена |
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

- [x] Новая структура `users/ldap/tasks/`
- [x] `result_handler` обрабатывает данные от воркера
- [x] Старый файл удалён

---

### Задача 5.2: Рефакторинг cleanup_zombie_tasks (Backend)

| Поле | Значение |
|------|----------|
| **Статус** | `[x]` Завершена |
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
3. Перенести определение в новый формат с `result_handler`
4. Добавить `result_handler` для логирования статистики очистки
5. Удалить старый `tasks.py`

**Файлы:**

| Действие | Путь |
|----------|------|
| CREATE | `backend/app/tasks/tasks/__init__.py` |
| CREATE | `backend/app/tasks/tasks/cleanup_zombie.py` |
| DELETE | `backend/app/tasks/tasks.py` |

**Код cleanup_zombie.py:**

```python
# backend/app/tasks/tasks/cleanup_zombie.py
from sqlalchemy.orm import Session
from app.core.task_contract import TaskDefinition

def result_handler(result: dict, db: Session) -> dict:
    """
    Обрабатывает результат очистки зомби-задач.
    Логирует статистику для аудита.
    """
    processed = result.get("processed", 0)
    terminated_ids = result.get("terminated_ids", [])
    
    # Можно добавить запись в таблицу аудита
    # или просто вернуть статистику для execution log
    return {
        "summary": f"Обработано {processed} зомби-задач",
        "terminated_count": len(terminated_ids),
        "terminated_ids": terminated_ids,
    }

TASK = TaskDefinition(
    name="system:cleanup_zombie_tasks",
    display_name="Очистка зависших задач",
    category="tasks",
    permission="tasks:cleanup",
    secrets=[],  # Не требует секретов
    params_schema={
        "type": "object",
        "properties": {
            "timeout_seconds": {
                "type": "integer",
                "default": 300,
                "description": "Таймаут в секундах"
            }
        }
    },
    result_handler=result_handler,
)
```

**Код __init__.py:**

```python
# backend/app/tasks/tasks/__init__.py
from .cleanup_zombie import TASK as cleanup_zombie

TASK_DEFINITIONS = [cleanup_zombie]
```

**Ожидаемый результат:**

- [x] Новая структура `tasks/tasks/`
- [x] `result_handler` логирует статистику очистки
- [x] Старый файл удалён

---

### Задача 5.3: Рефакторинг cleanup_zombie_tasks (Worker)

| Поле | Значение |
|------|----------|
| **Статус** | `[x]` Завершена |
| **Приоритет** | Средний |
| **Зависимости** | 5.2, 6.1 |

**Что есть сейчас:**

Файл `celery_worker/handlers/tasks/cleanup.py`:
```python
def cleanup_zombie_tasks(execution_id: str, secret: str = None, **kwargs):
    # ...
    for stale_id in stale_task_ids:
        # Напрямую обновляет статус через PATCH
        httpx.patch(
            f"{settings.BACKEND_INTERNAL_API_URL}/tasks/{stale_id_str}",
            json={"status": "FAILURE", "result": {"error": error_reason}},
            ...
        )
    return {"status": "ok", "processed": processed_count}
```

**Проблемы текущей реализации:**

1. Не возвращает список убитых `execution_id` для аудита
2. Handler не использует стандартный flow отправки результата

**Что нужно сделать:**

1. Добавить сбор `terminated_ids` в handler
2. Возвращать расширенный результат для `result_handler`
3. Результат будет обработан через стандартный `POST /tasks/{id}/result`

**Файлы:**

| Действие | Путь |
|----------|------|
| MODIFY | `celery_worker/handlers/tasks/cleanup.py` |

**Изменения в коде:**

```python
# celery_worker/handlers/tasks/cleanup.py

def cleanup_zombie_tasks(execution_id: str, secrets: dict = None, **kwargs):
    timeout = kwargs.get("timeout_seconds", 300)
    
    # ... существующая логика получения stale_task_ids ...
    
    processed_count = 0
    terminated_ids = []  # ДОБАВИТЬ: список для аудита
    
    for stale_id in stale_task_ids:
        stale_id_str = str(stale_id)
        error_reason = "Worker crashed or task lost"
        
        if stale_id_str in active_execution_ids:
            # ... существующая логика убийства ...
            error_reason = "Task hung (timeout) and was terminated"
        
        try:
            httpx.patch(...)
            processed_count += 1
            terminated_ids.append(stale_id_str)  # ДОБАВИТЬ
        except Exception as e:
            logger.error(...)
    
    # ИЗМЕНИТЬ: расширенный результат
    return {
        "status": "ok", 
        "processed": processed_count,
        "terminated_ids": terminated_ids,  # Для result_handler
    }
```

**Ожидаемый результат:**

- [x] Handler возвращает `terminated_ids` для аудита
- [x] `result_handler` на Backend логирует статистику в execution result
- [x] Полный аудит в execution log: какие задачи убиты, когда

---
---

### Задача 6.1: Обновление dispatch_task в Worker

| Поле | Значение |
|------|----------|
| **Статус** | `[x]` Завершена |
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
try:
    headers = {"X-API-Key": settings.CELERY_WORKER_API_KEY}
    httpx.post(
        f"{settings.BACKEND_INTERNAL_API_URL}/tasks/{current_execution_id}/result",
        json=result if isinstance(result, dict) else {"output": str(result)},
        headers=headers,
        timeout=30.0,
    )
except Exception as e:
    logger.error(f"Failed to send result: {e}")
    raise e
```

**Ожидаемый результат:**

- [x] Worker отправляет результат через API
- [x] Backend вызывает `result_handler` модуля

---

### Задача 9.1: Unit-тесты core

| Поле | Значение |
|------|----------|
| **Статус** | `[x]` Завершена |
| **Приоритет** | Средний |
| **Зависимости** | 1.1, 1.2, 1.3 |

**Что нужно сделать:**

1. Создать тесты для нового модуля `core/`
2. Покрыть основные функции: `collect_all_tasks()`, `get_task_definition()`, `dispatch_result()`

**Файлы:**

| Действие | Путь |
|----------|------|
| CREATE | `backend/tests/core/__init__.py` |
| CREATE | `backend/tests/core/test_task_contract.py` |
| CREATE | `backend/tests/core/test_task_collector.py` |
| CREATE | `backend/tests/core/test_task_dispatcher.py` |

**Тест-кейсы:**

```python
# test_task_collector.py
def test_collect_all_tasks_returns_list():
    """Проверяет, что collect_all_tasks возвращает список TaskDefinition."""
    
def test_collect_all_tasks_finds_sync_ldap():
    """Проверяет, что задача users:sync_ldap обнаружена."""
    
def test_get_task_definition_returns_correct_task():
    """Проверяет получение задачи по имени."""
    
def test_get_task_definition_returns_none_for_unknown():
    """Проверяет None для несуществующей задачи."""

# test_task_dispatcher.py
def test_dispatch_result_calls_handler():
    """Проверяет вызов result_handler."""
    
def test_dispatch_result_without_handler():
    """Проверяет поведение без result_handler."""
```

**Ожидаемый результат:**

- Тесты покрывают `collect_all_tasks()`, `get_task_definition()`, `dispatch_result()`
- `pytest backend/tests/core/` проходит

---

### Задача 9.2: Актуализация test_tasks_registry.py

| Поле | Значение |
|------|----------|
| **Статус** | `[x]` Завершена |
| **Приоритет** | Высокий |
| **Зависимости** | 8.1 |

**Что есть сейчас:**

Файл `backend/tests/test_tasks_registry.py` тестирует:
- `TASK_REGISTRY` глобальный dict
- `autodiscover_tasks()` из `registry.py`
- Регистрацию через кортежи `(name, schema, permission, context_loader)`

**Что нужно сделать:**

После удаления `registry.py` (задача 8.1):
1. Переписать тесты для `task_collector.py`
2. Заменить `TASK_REGISTRY` на `collect_all_tasks()`
3. Обновить формат TaskDefinition (dataclass вместо кортежа)

**Файлы:**

| Действие | Путь |
|----------|------|
| DELETE или REFACTOR | `backend/tests/test_tasks_registry.py` |

**Ожидаемый результат:**

- Тесты используют новый API из `task_collector`
- Нет импортов из `registry.py`

---

### Задача 9.3: Актуализация test_tasks_api.py

| Поле | Значение |
|------|----------|
| **Статус** | `[x]` Завершена |
| **Приоритет** | Высокий |
| **Зависимости** | 4.1, 4.2 |

**Что есть сейчас:**

Файл `backend/tests/test_tasks_api.py` тестирует:
- Запуск задач через API
- Использует `TASK_REGISTRY` для моков

**Что нужно сделать:**

1. Обновить моки для нового формата `TaskDefinition`
2. Добавить тесты для нового endpoint `POST /tasks/{id}/result`
3. Обновить тесты для рефакторенного `/secrets`

**Файлы:**

| Действие | Путь |
|----------|------|
| MODIFY | `backend/tests/test_tasks_api.py` |

**Новые тест-кейсы:**

```python
def test_receive_task_result_success():
    """Тест POST /internal/tasks/{id}/result — успешная обработка."""
    
def test_receive_task_result_calls_dispatch():
    """Проверяет вызов dispatch_result()."""
    
def test_get_secrets_from_db():
    """Тест /secrets — читает secrets из task_definitions."""
```

**Ожидаемый результат:**

- Тесты покрывают новые endpoints
- Моки соответствуют новому формату

---

### Задача 9.4: Актуализация test_tasks_internal_api.py

| Поле | Значение |
|------|----------|
| **Статус** | `[x]` Завершена |
| **Приоритет** | Высокий |
| **Зависимости** | 4.1, 4.2 |

**Что есть сейчас:**

Файл `backend/tests/test_tasks_internal_api.py` тестирует:
- `/internal/secrets`
- `/internal/task_execution`
- `/internal/tasks/{id}` (PATCH)

**Что нужно сделать:**

1. Обновить тесты `/secrets` — теперь читает из БД, не hardcoded
2. Добавить тесты для `POST /tasks/{id}/result`
3. Обновить fixtures для нового формата данных

**Файлы:**

| Действие | Путь |
|----------|------|
| MODIFY | `backend/tests/test_tasks_internal_api.py` |

**Новые тест-кейсы:**

```python
def test_secrets_reads_from_task_definitions_table():
    """Секреты читаются из task_definitions.secrets."""
    
def test_secrets_returns_empty_for_unknown_task():
    """Неизвестная задача — пустой dict."""
    
def test_result_endpoint_triggers_handler():
    """POST /result вызывает dispatch_result."""
```

**Ожидаемый результат:**

- Тесты покрывают новую логику secrets
- Тесты для result endpoint

---

### Задача 9.5: Тесты для модулей задач

| Поле | Значение |
|------|----------|
| **Статус** | `[x]` Завершена |
| **Приоритет** | Средний |
| **Зависимости** | 5.1, 5.2, 5.3 |

**Что нужно сделать:**

1. Создать тесты для `result_handler` в `users/ldap/tasks/sync_ldap.py`
2. Создать тесты для `result_handler` в `tasks/tasks/cleanup_zombie.py`

**Файлы:**

| Действие | Путь |
|----------|------|
| CREATE | `backend/tests/users/ldap/test_sync_ldap_task.py` |
| CREATE | `backend/tests/tasks/test_cleanup_zombie_task.py` |

**Тест-кейсы:**

```python
# test_sync_ldap_task.py
def test_result_handler_creates_new_users():
    """result_handler создаёт пользователей из LDAP данных."""

def test_result_handler_updates_existing_users():
    """result_handler обновляет существующих пользователей."""

def test_result_handler_disables_missing_users():
    """result_handler деактивирует отсутствующих в LDAP."""

# test_cleanup_zombie_task.py
def test_result_handler_returns_stats():
    """result_handler возвращает статистику очистки."""
```

**Ожидаемый результат:**

- `result_handler` модулей покрыты тестами
- `pytest backend/tests/users/ldap/` проходит

---

### Задача 9.6: Актуализация тестов Worker

| Поле | Значение |
|------|----------|
| **Статус** | `[x]` Завершена |
| **Приоритет** | Высокий |
| **Зависимости** | 5.3, 6.1 |

**Что есть сейчас:**

Файл `celery_worker/tests/test_dispatch_task.py`:
```python
from tasks import dispatch_task
from task_registry import register_task_handler

def test_dispatch_direct_success(mock_handler):
    result = dispatch_task(task_type="my_task", execution_id="exec-123", param1="val1")
    mock_handler.assert_called_once_with(execution_id="exec-123", secrets={}, param1="val1")
```

Файл `celery_worker/tests/test_task_registry.py`:
```python
from task_registry import register_task_handler, get_task_handler, autodiscover_handlers

def test_register_and_get_handler():
    register_task_handler("test_type", my_handler)
    assert get_task_handler("test_type") == my_handler
```

**Что нужно обновить:**

После рефакторинга `dispatch_task` (задача 6.1):
1. Добавить тест отправки результата на `POST /tasks/{id}/result`
2. Обновить mock для нового flow
3. Добавить тесты для `cleanup_zombie_tasks` handler

**Файлы:**

| Действие | Путь |
|----------|------|
| MODIFY | `celery_worker/tests/test_dispatch_task.py` |
| CREATE | `celery_worker/tests/test_cleanup_handler.py` |

**Новые тест-кейсы:**

```python
# test_dispatch_task.py
@patch("httpx.post")
def test_dispatch_sends_result_to_backend(mock_post, mock_handler):
    """После выполнения handler результат отправляется на /result."""
    mock_handler.return_value = {"status": "ok", "data": []}
    
    dispatch_task(task_type="my_task", execution_id="exec-123")
    
    # Проверяем вызов POST /tasks/exec-123/result
    calls = [c for c in mock_post.call_args_list if "/result" in str(c)]
    assert len(calls) == 1

# test_cleanup_handler.py
def test_cleanup_returns_terminated_ids():
    """cleanup_zombie_tasks возвращает список terminated_ids."""
    
def test_cleanup_patches_stale_tasks():
    """Handler вызывает PATCH для каждой зомби-задачи."""
```

**Ожидаемый результат:**

- Тесты проверяют новый flow отправки результата
- `pytest celery_worker/tests/` проходит

---

### Задача 10: обновление документации

| Поле | Значение |
|------|----------|
| **Статус** | `[x]` Завершена |
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
5.1, 5.2, 5.3 → 7.1 → 7.2, 7.3 → 7.4 → 7.5 → 8.1 → 9.1 → 10.1
```

---

## Легенда

| Статус | Описание |
|--------|----------|
| `[ ]` | Не начата |
| `[/]` | В процессе |
| `[x]` | Завершена |

---

## Дополнительные работы (Refactoring)

### Задача R.1: Рефакторинг получения настроек (Settings Resolver)

| Поле | Значение |
|------|----------|
| **Статус** | `[x]` Завершена |
| **Приоритет** | Критический |
| **Описание** |
| Устранение прямой зависимости `app/tasks` -> `app/settings/ldap|core` и создание масштабируемого механизма получения настроек. |

**Выполненные работы:**

1.  **Создан интерфейс резолвера (`app/core/settings_resolver.py`)**:
    - Определен протокол `SettingGetter`.
    - Реализован реестр резолверов.
    - Реализована функция `resolve_setting(db, key)`, итерирующаяся по зарегистрированным геттерам.

2.  **Реализован резолвер настроек (`app/settings/resolver.py`)**:
    - Реализована логика поиска настроек с приоритетом: LDAP -> Core.
    - Внедрена поддержка регистрации внешних геттеров через `register_setting_getter`.

3.  **Регистрация подмодулей (`app/settings/__init__.py`)**:
    - Настроена автоматическая регистрация геттеров при импорте подмодулей `core` и `ldap`.
    - Обеспечен правильный порядок импорта для приоритета LDAP настроек.

4.  **Обновление потребителей (`app/tasks/api/internal.py`)**:
    - Заменены прямые импорты из `app.settings.*` на использование `resolve_setting`.
    - Код стал независимым от конкретной реализации настроек.

**Результат:**
- Модуль `tasks` больше не зависит от внутренней структуры `settings`.
- Добавление новых источников настроек (например, `mail`, `integrations`) не требует изменения кода потребителей.

---

## Этап 7: Переход на Pydantic (Refactoring Phase 2)

**Цель:** Использовать Pydantic для определения параметров задач в коде (DX), но сохранять JSON Schema в БД (совместимость). Это устраняет необходимость ручного написания JSON Schema и обеспечивает строгую типизацию.

### Задача 7.1: Обновление TaskContract для Pydantic

| Поле | Значение |
|------|----------|
| **Статус** | `[x]` Завершена |
| **Приоритет** | Критический |
| **Зависимости** | 1.1 |

**Что нужно сделать:**
1.  Изменить `TaskDefinition` в `app/core/task_contract.py`.
2.  Поле `params_schema` должно принимать `type[BaseModel] | None`.

**Файлы:**
| Действие | Путь |
|----------|------|
| MODIFY | `backend/app/core/task_contract.py` |

**Код:**
```python
from pydantic import BaseModel
from typing import Type

@dataclass
class TaskDefinition:
    # ...
    params_schema: Type[BaseModel] | None = None
```

---

### Задача 7.2: Рефакторинг users/ldap/tasks (Service Consolidation)

| Поле | Значение |
|------|----------|
| **Статус** | `[x]` Завершена |
| **Приоритет** | Высокий |
| **Зависимости** | 7.1, 5.1 |

**Что нужно сделать:**
1.  **Backend: app/users/ldap/services.py**: Обновить `sync_ldap_users_batch`.
    - Перенести логику деактивации пользователей из `tasks/sync_ldap.py` в сервис.
    - Обеспечить полный цикл синхронизации (создание, обновление, деактивация) в одном методе за одну транзакцию.
2.  **Backend: app/users/ldap/tasks/sync_ldap.py**:
    - Установить `params_schema=None` (отказ от параметров запуска, синхронизация всегда полная).
    - Упростить `result_handler`: теперь это просто прокси-вызов `LdapService.sync_ldap_users_batch`.
3.  **Worker: handlers/users/sync_ldap.py**:
    - Убрать прямой HTTP-вызов внутреннего API бэкенда (`POST /users/sync_ldap`).
    - Возвращать список пользователей (`List[Dict]`) из обработчика. Инфраструктура воркера сама отправит результат на бэкенд.
4.  **Backend: app/users/ldap/schemas.py**: Удалить модель `SyncLdapParams` за ненадобностью.

**Файлы:**
| Действие | Путь |
|----------|------|
| MODIFY | `backend/app/users/ldap/services.py` |
| MODIFY | `backend/app/users/ldap/tasks/sync_ldap.py` |
| MODIFY | `celery_worker/handlers/users/sync_ldap.py` |
| MODIFY | `backend/app/users/ldap/schemas.py` |

---

### Задача 7.3: Рефакторинг system/cleanup (Service Consolidation)

| Поле | Значение |
|------|----------|
| **Статус** | `[x]` Завершена |
| **Приоритет** | Высокий |
| **Зависимости** | 7.1, 5.2 |

**Что нужно сделать:**
1.  **Backend: app/tasks/schemas.py**: Создать Pydantic модель `CleanupZombieParams`.
2.  **Backend: app/tasks/execution_service.py**: Добавить метод для пакетной пометки задач как `FAILURE` с указанием причины.
3.  **Backend: app/tasks/tasks/cleanup_zombie.py**:
    - Использовать Pydantic модель `CleanupZombieParams`.
    - Рефакторинг `result_handler`: вызывать сервис для деактивации задач, переданных воркером.
4.  **Worker: handlers/tasks/cleanup.py**:
    - Убрать прямые вызовы `PATCH /tasks/{id}` к бэкенду.
    - Возвращать список ID "зомби-задач" для обработки в `result_handler`.

**Файлы:**
| Действие | Путь |
|----------|------|
| MODIFY | `backend/app/tasks/schemas.py` |
| MODIFY | `backend/app/tasks/execution_service.py` |
| MODIFY | `backend/app/tasks/tasks/cleanup_zombie.py` |
| MODIFY | `celery_worker/handlers/tasks/cleanup.py` |

---

### Задача 7.4: Генерация схемы для БД

| Поле | Значение |
|------|----------|
| **Статус** | `[x]` Завершена |
| **Приоритет** | Высокий |
| **Зависимости** | 7.1, 3.1 |

**Что нужно сделать:**
1.  Обновить `sync_task_definitions` в `initial_data.py`.
2.  Если `params_schema` — класс Pydantic, вызывать `.model_json_schema()`.
3.  Если `dict` — сохранять как есть.

**Файлы:**
| Действие | Путь |
|----------|------|
| MODIFY | `backend/app/tasks/initial_data.py` |

---

### Задача 7.5: Валидация и миграция TaskService

| Поле | Значение |
|------|----------|
| **Статус** | `[x]` Завершена |
| **Приоритет** | Высокий |
| **Зависимости** | 7.1 |

**Что нужно сделать:**
1.  Удалить `TASK_REGISTRY` и `autodiscover_tasks` из `backend/app/tasks/services.py`.
2.  Переписать методы `get_all_tasks` и `run_task_by_name`, используя `collect_all_tasks` и `get_task_definition` из `app.core.task_collector`.
3.  В `run_task_by_name` проверять тип `params_schema`:
    - Если Pydantic — валидировать: `validated_params = task_def.params_schema(**params)`.
    - Если dict — валидировать (опционально) или пропускать.
    - Обрабатывать `ValidationError` от Pydantic и возвращать 422.

**Файлы:**
| Действие | Путь |
|----------|------|
| MODIFY | `backend/app/tasks/services.py` |

---

## Этап 8: Очистка (Final Cleanup)

### Задача 8.1: Удаление старого Registry

| Поле | Значение |
|------|----------|
| **Статус** | `[x]` Завершена |
| **Приоритет** | Средний |
| **Зависимости** | 7.5 |

**Что нужно сделать:**
1.  Удалить `backend/app/tasks/registry.py`.
2.  Удалить ссылки на него из `backend/main.py` (удалить `autodiscover_tasks`).
3.  Удалить старые тесты реестра (`backend/tests/test_tasks_registry.py`).
4.  Проверить, что приложение запускается и `services.py` работает.

**Файлы:**
| Действие | Путь |
|----------|------|
| DELETE | `backend/app/tasks/registry.py` |
| MODIFY | `backend/main.py` |
| DELETE | `backend/tests/test_tasks_registry.py` |
