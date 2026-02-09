# Детальный план работ по реализации новой функциональности: Интеграция Celery (v2)

Данный документ описывает детальный план по интеграции асинхронного выполнения задач с использованием Celery. Архитектура разделяет Celery-компоненты на два полностью независимых сервиса: `celery_worker` (для выполнения бизнес-логики) и `celery_beat` (для планирования задач). Это обеспечивает строгую изоляцию, минимизирует зависимости и повышает стабильность системы, а также полностью исключает кодовые зависимости между `celery_worker` и `celery_beat`.

## 1. Создание независимых сервисов `celery_worker` и `celery_beat`

### 1.1. Создание базовой структуры
*   1.1.1. (completed) Создать новую корневую папку `celery_worker/`. Описание: Это директория сервиса, отвечающего за выполнение бизнес-логики асинхронных задач. Создать виртуальное окружение с помощью uv.
*   1.1.2. (completed) Создать новую корневую папку `celery_beat/`. Описание: Это директория легковесного сервиса, отвечающего исключительно за чтение расписания из БД и постановку задач в очередь. Создать виртуальное окружение с помощью uv.

---

## 2. Настройка сервиса `celery_worker`

### 2.1. Файлы `celery_worker/`
*   2.1.1. (completed) Создать файл `celery_worker/celery_app.py`. Описание: Инициализация Celery-приложения для worker-а.
    ```python
    # celery_worker/celery_app.py
    from celery import Celery
    from .config import settings

    celery_app = Celery(
        "celery_worker",
        broker=settings.REDIS_TASK_URL,
        backend=settings.REDIS_RESULT_URL
    )
    celery_app.config_from_object('celery_worker.config')
    # worker будет автообнаруживать задачи из celery_worker.tasks
    celery_app.autodiscover_tasks(['celery_worker.tasks'])
    ```
*   2.1.2. (completed) Создать файл `celery_worker/tasks.py`. Описание: Реализация единственной задачи-диспетчера, которая маршрутизирует выполнение на основе `task_type`.
    ```python
    # celery_worker/tasks.py
    import logging
    from typing import Any, Optional
    import httpx
    from .celery_app import celery_app
    from .config import settings
    from .task_registry import get_task_handler # Для доступа к бизнес-логике

    logger = logging.getLogger(__name__)

    @celery_app.task(name="tasks.dispatch")
    def dispatch_task(
        task_type: str,
        schedule_id: Optional[str] = None,
        execution_id: Optional[str] = None,
        **kwargs
    ) -> Any:
        """
        Диспетчер задач.
        Принимает тип задачи (task_type), получает необходимые для выполнения секреты
        из центрального бэкенда и маршрутизирует выполнение на соответствующую бизнес-логику.
        """
        current_task_type = task_type
        current_execution_id = execution_id
        current_kwargs = kwargs

        # 1. Если задача плановая, сначала получаем ее execution_id и параметры
        if schedule_id:
            logger.info(f"Получена запланированная задача с schedule_id='{schedule_id}'. Обращаемся к бэкенду за execution_id и параметрами.")
            try:
                headers = {"X-API-Key": settings.CELERY_WORKER_API_KEY}
                response = httpx.post(
                    f"{settings.BACKEND_INTERNAL_API_URL}/task_execution",
                    json={"schedule_id": schedule_id},
                    headers=headers,
                    timeout=10.0
                )
                response.raise_for_status()

                backend_data = response.json()
                current_execution_id = backend_data["execution_id"]
                current_task_type = backend_data["task_type"]
                current_kwargs = backend_data["params"]
                logger.info(f"Бэкенд вернул execution_id='{current_execution_id}', task_type='{current_task_type}', параметры: {current_kwargs}")

            except httpx.HTTPStatusError as e:
                logger.error(f"Ошибка HTTP при обращении к бэкенду для schedule_id '{schedule_id}': {e.response.status_code} - {e.response.text}")
                raise ValueError(f"Не удалось получить execution_id от бэкенда для schedule_id '{schedule_id}': HTTP {e.response.status_code}")
            except httpx.RequestError as e:
                logger.error(f"Ошибка запроса к бэкенду для schedule_id '{schedule_id}': {e}")
                raise ValueError(f"Не удалось подключиться к бэкенду для schedule_id '{schedule_id}': {e}")
            except KeyError as e:
                logger.error(f"Ответ бэкенда не содержит ожидаемых полей (execution_id, task_type, params): {backend_data}. Ошибка: {e}")
                raise ValueError(f"Некорректный ответ от бэкенда при обработке schedule_id '{schedule_id}'")

        if not current_execution_id:
            logger.error(f"Не удалось получить execution_id для задачи с task_type='{current_task_type}'.")
            raise ValueError("Отсутствует execution_id для выполнения задачи.")

        # 2. Получаем секрет, необходимый для выполнения этой задачи
        secret = None
        try:
            logger.info(f"Запрашиваем секрет для task_type='{current_task_type}' (execution_id='{current_execution_id}')")
            headers = {"X-API-Key": settings.CELERY_WORKER_API_KEY}
            response = httpx.post(
                f"{settings.BACKEND_INTERNAL_API_URL}/secrets",
                json={"task_type": current_task_type},
                headers=headers,
                timeout=10.0
            )
            response.raise_for_status()
            secret = response.json().get("secret")
            logger.info(f"Секрет для task_type='{current_task_type}' успешно получен.")
        except httpx.HTTPStatusError as e:
            logger.error(f"Ошибка HTTP при получении секрета для task_type '{current_task_type}': {e.response.status_code} - {e.response.text}")
            raise ValueError(f"Не удалось получить секрет: HTTP {e.response.status_code}")
        except httpx.RequestError as e:
            logger.error(f"Ошибка запроса при получении секрета для task_type '{current_task_type}': {e}")
            raise ValueError(f"Не удалось подключиться к бэкенду для получения секрета: {e}")

        # 3. Выполняем саму бизнес-логику
        logger.info(f"Начинаем выполнение задачи task_type='{current_task_type}' (execution_id='{current_execution_id}') с параметрами: {current_kwargs}")
        
        handler = get_task_handler(current_task_type)
        if handler:
            try:
                # Передаем секрет в обработчик вместе с остальными параметрами
                result = handler(execution_id=current_execution_id, secret=secret, **current_kwargs)
                logger.info(f"Задача task_type='{current_task_type}' (execution_id='{current_execution_id}') завершена успешно.")
                return result
            except Exception as e:
                logger.error(f"Ошибка при выполнении задачи task_type='{current_task_type}' (execution_id='{current_execution_id}'): {e}", exc_info=True)
                raise e
        else:
            logger.error(f"Обработчик для task_type '{current_task_type}' не найден (execution_id='{current_execution_id}').")
            raise ValueError(f"Обработчик для task_type '{current_task_type}' не найден.")
    ```
*   2.1.3. (completed) Создать файл `celery_worker/config.py`. Описание: Конфигурация для worker-а.
    ```python
    # celery_worker/config.py
    from pydantic_settings import BaseSettings, SettingsConfigDict
    import os

    class WorkerSettings(BaseSettings):
        REDIS_TASK_URL: str = "redis://redis:6379/0"
        REDIS_RESULT_URL: str = "redis://redis:6379/1"
        CELERY_TIMEZONE: str = "Europe/Moscow"
        CELERY_ENABLE_UTC: bool = True
        CELERY_ACCEPT_CONTENT: list[str] = ['json']
        CELERY_TASK_SERIALIZER: str = 'json'
        CELERY_RESULT_SERIALIZER: str = 'json'
        # CELERY_IMPORTS не указываем, т.к. используется autodiscover_tasks

        BACKEND_INTERNAL_API_URL: str
        CELERY_WORKER_API_KEY: str

        model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    settings = WorkerSettings()
    ```
*   2.1.4. (completed) Создать структуру `celery_worker/handlers/` и `celery_worker/task_registry.py`. Описание: Место для реализации и регистрации бизнес-логики конкретных задач.
*   2.1.5. (completed) установить с помощью uv полный набор зависимостей.
    ```
    celery
    redis
    pydantic-settings
    httpx
    ```
*   2.1.6. (completed) Создать файл `celery_worker/start_worker.sh`. Скрипт для запуска worker-а.
    ```bash
    #!/bin/bash
    # celery_worker/start_worker.sh
    export PYTHONPATH="$(pwd)"
    echo "Запуск Celery Worker..."
    exec celery -A celery_worker.celery_app worker --loglevel=info -P prefork
    ```

---

## 3. Настройка сервиса `celery_beat`

### 3.1. Файлы `celery_beat/`
*   3.1.1. (completed) Создать файл `celery_beat/celery_app.py`. Описание: Легковесная инициализация Celery-приложения для beat-а.
    ```python
    # celery_beat/celery_app.py
    from celery import Celery
    from .config import settings

    celery_app = Celery("celery_beat", broker=settings.REDIS_TASK_URL)
    celery_app.config_from_object('celery_beat.config')
    # Celery Beat не импортирует задачи, он получает их имена из БД.
    celery_app.conf.update(
        CELERY_TIMEZONE = settings.CELERY_TIMEZONE,
        CELERY_BEAT_SCHEDULER = settings.CELERY_BEAT_SCHEDULER,
        CELERY_BEAT_SCHEDULE_FILENAME = '/tmp/celerybeat-schedule' # Файл для PersistentScheduler
    )
    ```
*   3.1.2. (completed) Создать файл `celery_beat/config.py`. Описание: Минимальная конфигурация для beat-а.
    ```python
    # celery_beat/config.py
    from pydantic_settings import BaseSettings, SettingsConfigDict
    import os

    class BeatSettings(BaseSettings):
        REDIS_TASK_URL: str = "redis://redis:6379/0"
        CELERY_BEAT_SCHEDULER: str = "celery.beat.PersistentScheduler"
        CELERY_BEAT_DB_URL: str # URL к PostgreSQL для хранения расписания
        CELERY_TIMEZONE: str = "Europe/Moscow" # Часовой пояс для beat

        model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    settings = BeatSettings()
    ```
*   3.1.3. (completed) Установить с помощью uv минимальный набор зависимостей.
    ```
    celery
    redis
    pydantic-settings
    psycopg2-binary # Драйвер для PostgreSQL
    sqlalchemy # Часто требуется для PersistentScheduler
    ```
*   3.1.4. (completed) Создать файл `celery_beat/start_beat.sh`. Скрипт для запуска beat-а.
    ```bash
    #!/bin/bash
    # celery_beat/start_beat.sh
    export PYTHONPATH="$(pwd)"
    rm -f /tmp/celerybeat.pid
    echo "Запуск Celery Beat..."
    exec celery -A celery_beat.celery_app beat --loglevel=info --pidfile=/tmp/celerybeat.pid
    ```
*   **Важное замечание:** `celery_beat` не имеет файла `tasks.py` и не импортирует никакие задачи. Он работает в режиме "без задач", а расписание берет из базы данных, где имя задачи (`tasks.dispatch`) хранится как строка. Это обеспечивает полную независимость от кодовой базы `celery_worker`.

---

## 4. Интеграция с Основным FastAPI-бэкендом (`backend/`)

Этот раздел описывает, как основной бэкенд будет инициировать задачи, управлять секретами и предоставлять API для взаимодействия с системой фоновых задач. Архитектура построена на принципах слабой связанности и инверсии управления.

### 4.1. (completed) Адаптация конфигурации и создание клиента Celery
*   **4.1.1. `backend/app/core/config.py`**: В основной класс `Settings` необходимо добавить переменные, связанные с Celery:
    ```python
    class Settings(BaseSettings):
        # ... другие настройки
        REDIS_TASK_URL: str = "redis://redis:6379/0"
        FLOWER_API_URL: str = "http://flower-service:5555"
        CELERY_WORKER_API_KEY: str # Секретный ключ для авторизации celery-worker
    ```
*   **4.1.2. `backend/app/core/celery_client.py`**: Создать локальный экземпляр клиента Celery. Он используется только для отправки задач в брокер и не загружает никакой логики выполнения.
    ```python
    from celery import Celery
    from .config import settings

    celery_client = Celery(
        'backend_client',
        broker=settings.REDIS_TASK_URL,
        backend=None, # Бэкенду не нужно читать результаты
        include=[] # Убедимся, что он не ищет и не загружает код задач
    )
    ```

### 4.2. (completed) Архитектура реестра задач с автообнаружением
Для масштабирования на сотни задач мы используем паттерн "Реестр с автообнаружением".

*   **4.2.1. Создание реестра (`backend/app/tasks/registry.py`)**:
    *   **Описание**: Этот модуль определяет `TaskDefinition` (класс для описания задачи) и `TASK_REGISTRY` (глобальный словарь для их хранения). Ключевое здесь — функция `autodiscover_tasks`, которая при старте приложения будет находить и регистрировать все задачи.
    *   **`TaskDefinition`**: Хранит имя задачи (например, `users:sync_ldap`), Pydantic-схему для ее параметров и требуемое для запуска разрешение.
    *   **`autodiscover_tasks()`**: Проходит по всем модулям приложения (например, `users`, `reports`), ищет в них файлы `tasks.py` и подгружает из них списки `TASK_DEFINITIONS`.

*   **4.2.2. Декларация задач в модулях**:
    *   **Описание**: Каждый модуль, которому нужны фоновые задачи, декларирует их в своем файле `tasks.py`, не имея прямой зависимости от реестра.
    *   **Пример (`backend/app/users/tasks.py`)**:
        ```python
        from pydantic import BaseModel, Field

        class SyncLdapParams(BaseModel):
            group_dn: str = Field(description="DN группы для синхронизации")

        # Просто список кортежей, который будет обнаружен автоматически
        TASK_DEFINITIONS = [
            ( "users:sync_ldap", SyncLdapParams, "users:tasks:sync" )
        ]
        ```

*   **4.2.3. Запуск автообнаружения (`backend/main.py`)**:
    *   При старте приложения в `main.py` необходимо вызвать `autodiscover_tasks()` для наполнения реестра.

### 4.3. (completed) Универсальный API для управления задачами
На основе наполненного реестра создаются два универсальных эндпоинта.

*   **4.3.1. Сервис задач (`backend/app/tasks/services.py`)**:
    *   **Описание**: `TaskService` инкапсулирует логику запуска задач. Его метод `run_task_by_name` будет:
        1.  Находить задачу в `TASK_REGISTRY` по имени.
        2.  Проверять права доступа пользователя (сравнивая с `permission` из `TaskDefinition`).
        3.  Валидировать переданные параметры с помощью `params_schema` из `TaskDefinition`.
        4.  Создавать запись в таблице `TaskExecution` (см. п. 4.5).
        5.  Использовать `celery_client` для отправки сообщения в Redis.

*   **4.3.2. API-эндпоинты (`backend/app/api/v1/tasks.py`)**:
    *   `GET /tasks`: Возвращает список всех задач из `TASK_REGISTRY` с их именами и схемами параметров. Позволяет UI динамически строить формы для запуска.
    *   `POST /tasks/{task_name}/run`: Универсальный эндпоинт для запуска любой задачи по ее имени. Принимает `task_name` в пути и `params` в теле запроса.

### 4.4. Архитектура получения секретов (Dynamic Permissions)
Для управления доступом задач к чувствительным настройкам используется система разрешений в базе данных.

*   **4.4.1. Модель `TaskSecretMapping`**:
    *   Создать модель `backend/app/settings/models.py`.
    *   Поля: `id`, `task_type` (str, index), `setting_key` (str).
    *   Назначение: Определяет, к каким ключам настроек имеет доступ конкретный тип задачи.

*   **4.4.2. Инициализация прав (Initial Data)**:
    *   Создать модуль инициализации `backend/app/settings/initial_permissions.py`.
    *   При старте приложения автоматически создавать необходимые записи в `TaskSecretMapping` для системных задач.
    *   Для задачи `users:sync_ldap` регистрируется доступ к `LdapSetting:LDAP_BIND_PASSWORD`.

*   **4.4.3. Универсальный API-эндпоинт (`backend/app/settings/api/internal.py`)**:
    *   Реализовать эндпоинт `POST /api/internal/secrets`.
    *   **Входные параметры**: `task_type` (строка).
    *   **Алгоритм работы**:
        1.  Найти все разрешенные ключи в таблице `TaskSecretMapping`.
        2.  **Resolution**: Ключ имеет формат `ModelName:KeyName` (например, `LdapSetting:LDAP_BIND_PASSWORD`).
        3.  Распарсить ключ, найти соответствующую модель и извлечь значение.
        4.  Вернуть словарь `{KeyName: value}` (или с префиксом, по договоренности).
    *   Такой подход обеспечивает гибкость конфигурации и централизованный контроль доступа к секретам.

### 4.5. (completed) Модели и Миграции Базы Данных
*   **4.5.1. `TaskExecution`**: Кастомная модель для хранения истории всех запусков задач. Структура включает `id`, `task_type`, `params`, `status`, `triggered_by`, `result`, **`heartbeat_at` (DateTime, для отказоустойчивости)**.
*   **4.5.2. Модели планировщика**: Модели из `celery-sqlalchemy-scheduler` (`PeriodicTask`, `CrontabSchedule` и др.) импортируются в `backend` (например, в `backend/app/tasks/models.py`), чтобы Alembic мог управлять ими.
*   **4.5.3. Миграции Alembic**: После определения всех моделей (кастомных и импортированных) генерируются и применяются миграции для создания всех необходимых таблиц в БД.

### 4.6. Реализация Синхронизации LDAP (Task Implementation)
Этот раздел описывает конкретную реализацию периодической задачи `users:sync_ldap`.

*   **4.6.1. (completed) Обновление передачи настроек (Backend)**:
    *   Модифицировать функцию `_sync_schedule` (в `settings/api/ldap.py` и `main.py`).
    *   При формировании задачи `users:sync_ldap` добавлять в `kwargs` следующие не-секретные настройки: `URI`, `BASE_DN`, `BIND_DN`, `USER_FILTER`.
    *   **Обработка секрета**: Пароль `LDAP_BIND_PASSWORD` **не передается** в параметрах задачи через Redis. Вместо этого, он остается в защищенном хранилище настроек бэкенда. Воркер получит его отдельно через Internal API.

*   **4.6.2. Утилиты LDAP для Воркера (Worker)**:
    *   Создать модуль `celery_worker/utils/ldap.py`.
    *   **Default Mappings**: Определить две константы-словаря с максимально полным набором атрибутов:
        *   `DEFAULT_AD_MAPPING`: `{"login": "sAMAccountName", "full_name": "displayName", "email": "mail", "ldap_id": "objectGUID", "is_active": "userAccountControl", ...}`
        *   `DEFAULT_OPENLDAP_MAPPING`: `{"login": "uid", "full_name": "cn", "email": "mail", "ldap_id": "entryUUID", ...}`
    *   Реализовать функции для работы с `ldap3`:
        *   `connect_to_ldap(...)` -> Connection.
        *   `detect_server_type(server_info)` -> 'ad' | 'openldap'.
        *   `fetch_users(connection, base_dn, search_filter, attributes_list)` -> List[dict].
    *   Логика должна принимать *список атрибутов* для запроса, делая функцию универсальной.

*   **4.6.3. API для приема пользователей (Backend)**:
    *   Создать модуль `backend/app/users/api/internal.py`.
    *   Реализовать эндпоинт `POST /api/internal/users/sync`.
    *   Принимаемая модель: список объектов `LdapUserSyncSchema` (ldap_id, login, email, full_name, dn, is_active).
    *   Логика (`UserService.sync_batch`):
        *   Получение списка существующих пользователей типа 'ldap'.
        *   Upsert: Обновление данных для совпадений по `ldap_id` (или `login` как fallback), создание новых.
        *   (Опционально) Обработка неактивных/удаленных в LDAP.

*   **4.6.4. Реализация Хендлера (Worker)**:
    *   Создать `celery_worker/handlers/users/sync.py`.
    *   Реализовать функцию-хендлер `sync_users_handler(execution_id, secret, **ldap_settings)`.
    *   **Алгоритм выполнения**:
        1.  **Получение параметров**: Хендлер получает не-секретные настройки (`URI`, `DN`...) из аргументов функции (`**kwargs`).
        2.  **Получение секрета**: Секрет (`bind_password`) передается в функцию диспетчером задач, который предварительно запрашивает его у бэкенда через `POST /api/internal/secrets` (см. п. 4.4.3).
        3.  **Подключение**: Инициализация соединения с LDAP сервером используя полученные настройки и пароль.
        4.  **Поиск**: Выполнение поиска всех пользователей с учетом фильтра.
        5.  **Трансформация**: Преобразование результатов в список унифицированных словарей.
        6.  **Отправка**: Отправка батча данных на бэкенд через `POST /api/internal/users/sync`.
        7.  **Завершение**: Обновление статуса выполнения задачи и отправка метрик.

### 4.7. (completed) Мониторинг и Дашборды
Для обеспечения наблюдаемости системы необходимо реализовать два типа дашбордов.

*   **4.7.1. Дашборд статуса Worker-ов (через Flower API)**:
    *   **Описание**: Для отображения статусов Celery Worker-ов и активных задач в реальном времени будет реализован API-эндпоинт в FastAPI, который проксирует запросы к Flower API.
    *   **Логика**: Бэкенд будет выполнять HTTP-запросы к Flower API (доступному по `FLOWER_API_URL`), агрегировать метрики (кол-во worker-ов, их статус, активные задачи) и предоставлять их для дашборда в UI.
    *   **Эндпоинт**: `GET /api/v1/metrics/celery/status` в новом модуле `backend/app/api/v1/metrics.py`.

*   **4.7.2. Дашборд истории выполнения задач**:
    *   **Описание**: Для просмотра истории всех выполненных, текущих и проваленных задач будет создан отдельный дашборд в UI.
    *   **Источник данных**: Этот дашборд будет напрямую использовать данные из кастомной таблицы `TaskExecution` (см. п. 4.5.1), запрашивая их через стандартный API бэкенда. Это позволит реализовать фильтрацию, поиск и детальный просмотр каждого запуска задачи, включая его параметры и результат/ошибку.
    
### 4.8. (completed) Обратная связь с UI и отказоустойчивость
Этот раздел описывает механизм получения обратной связи о ходе выполнения задачи и защиту от "зависания" задач.

*   **4.8.1. API для опроса статуса (Polling)**:
    *   **Описание**: UI, запустив задачу и получив `execution_id`, будет периодически опрашивать бэкенд для получения обновлений статуса.
    *   **Новый эндпоинт `GET /api/v1/task_executions/{execution_id}`**: Возвращает полную запись о выполнении задачи из таблицы `TaskExecution`, включая `status`, `progress`, `result` и т.д.
    *   **Новый сервис `TaskExecutionService`**: Будет содержать логику для получения и обновления записей о выполнении задач.

*   **4.8.2. Механизм обновления прогресса из Worker-а**:
    *   **Описание**: Для отображения детального прогресса (например, в прогресс-баре) `celery-worker` будет сам сообщать о ходе выполнения.
    *   **Новый эндпоинт `PATCH /api/internal/tasks/{execution_id}`**: Позволяет воркеру обновлять запись о выполнении, отправляя, например, процент выполнения, текстовый статус и `heartbeat_at`.
    *   **Логика в Worker-е**: Обработчики задач в воркере (например, `perform_ldap_sync`) будут периодически вызывать этот `PATCH` эндпоинт.

*   **4.8.3. Обработка "зависших" задач (Zombie Task Handling)**:
    *   **Проблема**: Если `celery-worker` аварийно завершается, задача может навсегда остаться в статусе `IN_PROGRESS`.
    *   **Решение (Heartbeat + Active Check)**:
        1.  В модель `TaskExecution` добавляется поле `heartbeat_at` (DateTime).
        2.  `Celery-worker`, выполняя задачу, через `PATCH` эндпоинт (п. 4.8.2) регулярно обновляет это поле, показывая, что он "жив".
        3.  Создается **системная плановая задача** `system:cleanup_zombie_tasks`, которая запускается через `celery-beat` каждые 5-10 минут.
        4.  **Логика**:
            *   Воркер запрашивает у бэкенда (`POST /api/internal/tasks/stale`) список задач с просроченным heartbeat.
            *   Для каждой задачи воркер проверяет через `app.control.inspect().active()`, выполняется ли она сейчас.
            *   **Случай 1 (Зависание)**: Если задача **найдена** в списке активных:
                *   Принудительно завершает её через `app.control.revoke(task_id, terminate=True)`.
                *   Отправляет статус `FAILURE` с причиной "Task hung (timeout) and was terminated".
            *   **Случай 2 (Крах воркера/Потеря)**: Если задача **не найдена** в списке активных (воркер перезагрузился или умер):
                *   Просто отправляет статус `FAILURE` с причиной "Worker crashed or task lost".

### 4.9. (completed) Аутентификация и RBAC
*   **4.9.1. Права доступа**: Добавить в `initial_data.py` право `tasks:read`.
*   **4.9.2. Защита API**:
    *   `GET /api/v1/tasks`: Требует аутентификации и права `tasks:read`.
    *   `POST /api/v1/tasks/{task_name}/run`: Требует аутентификации. Право на запуск проверяется динамически на основе требования конкретной задачи (например, `users:create`).
*   **4.9.3. Интеграция в Service Layer**:
    *   `TaskService` должен принимать текущего пользователя и его права.
    *   Реализовать проверку прав перед запуском задачи.
    *   Записывать реальное имя пользователя в поле `triggered_by`.
---

## 5. Рекомендации по Контейнеризации

*   5.1. (completed) Описать рекомендации по контейнеризации (FastAPI, Celery Worker, Celery Beat, Flower, Redis, PostgreSQL), с учетом строгого разделения.
    *   **FastAPI Container:**
        *   Dockerfile для создания образа из папки `backend/`.
        *   Устанавливает зависимости из `backend/pyproject.toml` (или `requirements.txt`).
    *   **Celery Worker Container:**
        *   Dockerfile для создания образа из папки `celery_worker/`.
        *   Устанавливает зависимости из `celery_worker/requirements.txt`.
        *   Запускает `celery_worker/start_worker.sh`.
    *   **Celery Beat Container:**
        *   Dockerfile для создания образа из папки `celery_beat/`.
        *   Устанавливает зависимости из `celery_beat/requirements.txt`.
        *   Запускает `celery_beat/start_beat.sh`.
        *   **Ключевой момент:** Этот контейнер будет максимально легковесным, содержащим только код и зависимости, необходимые для планировщика, без какой-либо бизнес-логики worker-а.
    *   **Flower Container:**
        *   Dockerfile для создания образа.
        *   Flower должен иметь доступ к брокеру Celery (Redis) для мониторинга.
    *   **Redis Container:** Официальный образ Redis, выступает в роли брокера сообщений.
    *   **PostgreSQL Container:** Официальный образ PostgreSQL, используется для основной БД и для хранения расписаний Celery Beat.
    *   **Docker Compose (`docker-compose.yml`):**
        *   Будет использовать `docker-compose.yml` для определения и связывания всех этих независимых сервисов.
        *   **Сетевое взаимодействие:** Настраивается так, чтобы сервисы могли общаться по имени контейнера.
        *   **Переменные окружения:** Все настройки передаются через переменные окружения, определенные в `docker-compose.yml` или в `.env` файлах для каждого сервиса.
        *   **Отсутствие общего кода:** В этой архитектуре `celery_worker` и `celery_beat` полностью независимы на уровне файловой системы, и не имеют прямых импортов друг в друга. Любой общий код (например, Pydantic-схемы для моделей БД, если они используются в разных сервисах) должен быть вынесен в отдельную "общую" библиотеку или дублироваться при осознанном решении.
---
## 6. Тестирование
*   6.1. Unit-тесты: Покрыть сервисы (`TaskService`, `TaskExecutionService` и др.) и провайдеры юнит-тестами с использованием моков для БД и внешних вызовов.
*   6.2. Интеграционные тесты: Написать тесты для API-эндпоинтов (`/tasks`, `/task_executions`, `/internal/secrets`), проверяющие полный цикл от HTTP-запроса до отправки задачи в (замоканный) Redis.
*   6.3. Security-тесты: Проверить, что эндпоинты `/tasks` недоступны без токена, `GET /tasks` недоступен без права `tasks:read`, а запуск задачи невозможен без специфичного права.
*   6.4. Тестирование Worker-а: Написать тесты для обработчиков задач в `celery-worker`, проверяющие корректность их бизнес-логики.

## 7. Документация
*   7.1. Актуализация архитектурной документации: Обновить существующие документы в папке `docs/`, отразив в них новую архитектуру асинхронных задач, сервисов `celery-worker` и `celery-beat`.
*   7.2. Документация API: Убедиться, что все новые эндпоинты (включая внутренние) имеют исчерпывающие описания, Pydantic-схемы и примеры в сгенерированной OpenAPI (Swagger) документации. Security Schemes должны быть настроены.
*   7.3. Руководство для разработчиков: Добавить раздел о том, как создавать и регистрировать новые фоновые задачи, их обработчики и провайдеры секретов согласно принятым паттернам. Описать процесс назначения прав для задач.