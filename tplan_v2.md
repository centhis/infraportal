# Детальный план работ по реализации новой функциональности: Интеграция Celery (v2)

Данный документ описывает детальный план по интеграции асинхронного выполнения задач с использованием Celery. Архитектура разделяет Celery-компоненты на два полностью независимых сервиса: `celery_worker` (для выполнения бизнес-логики) и `celery_beat` (для планирования задач). Это обеспечивает строгую изоляцию, минимизирует зависимости и повышает стабильность системы, а также полностью исключает кодовые зависимости между `celery_worker` и `celery_beat`.

## 1. Создание независимых сервисов `celery_worker` и `celery_beat`

### 1.1. Создание базовой структуры
*   1.1.1. (pending) Создать новую корневую папку `celery_worker/`. Описание: Это директория сервиса, отвечающего за выполнение бизнес-логики асинхронных задач.
*   1.1.2. (pending) Создать новую корневую папку `celery_beat/`. Описание: Это директория легковесного сервиса, отвечающего исключительно за чтение расписания из БД и постановку задач в очередь.

---

## 2. Настройка сервиса `celery_worker`

### 2.1. Файлы `celery_worker/`
*   2.1.1. (pending) Создать файл `celery_worker/celery_app.py`. Описание: Инициализация Celery-приложения для worker-а.
    ```python
    # celery_worker/celery_app.py
    from celery import Celery
    from .config import settings

    celery_app = Celery(
        "celery_worker",
        broker=settings.CELERY_BROKER_URL,
        backend=settings.CELERY_RESULT_BACKEND
    )
    celery_app.config_from_object('celery_worker.config')
    # worker будет автообнаруживать задачи из celery_worker.tasks
    celery_app.autodiscover_tasks(['celery_worker.tasks'])
    ```
*   2.1.2. (pending) Создать файл `celery_worker/tasks.py`. Описание: Реализация единственной задачи-диспетчера, которая маршрутизирует выполнение на основе `task_type`.
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
        Принимает тип задачи (task_type), schedule_id (для запланированных задач),
        execution_id (для ручных задач) и произвольные аргументы (kwargs).
        Маршрутизирует выполнение на соответствующую бизнес-логику внутри worker.
        """
        current_task_type = task_type
        current_execution_id = execution_id
        current_kwargs = kwargs

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
            logger.error(f"Не удалось получить execution_id ни из аргументов, ни от бэкенда для задачи с task_type='{current_task_type}' и schedule_id='{schedule_id}'.")
            raise ValueError("Отсутствует execution_id для выполнения задачи.")

        logger.info(f"Начинаем выполнение задачи task_type='{current_task_type}' (execution_id='{current_execution_id}') с параметрами: {current_kwargs}")

        from celery_worker.task_registry import get_task_handler
        handler = get_task_handler(current_task_type)
        if handler:
            try:
                result = handler(execution_id=current_execution_id, **current_kwargs)
                logger.info(f"Задача task_type='{current_task_type}' (execution_id='{current_execution_id}') завершена успешно.")
                return result
            except Exception as e:
                logger.error(f"Ошибка при выполнении задачи task_type='{current_task_type}' (execution_id='{current_execution_id}'): {e}", exc_info=True)
                raise e
        else:
            logger.error(f"Обработчик для task_type '{current_task_type}' не найден (execution_id='{current_execution_id}').")
            raise ValueError(f"Обработчик для task_type '{current_task_type}' не найден.")
    ```
*   2.1.3. (pending) Создать файл `celery_worker/config.py`. Описание: Конфигурация для worker-а.
    ```python
    # celery_worker/config.py
    from pydantic_settings import BaseSettings, SettingsConfigDict
    import os

    class WorkerSettings(BaseSettings):
        CELERY_BROKER_URL: str = "redis://redis:6379/0"
        CELERY_RESULT_BACKEND: str = "redis://redis:6379/0"
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
*   2.1.4. (pending) Создать структуру `celery_worker/handlers/` и `celery_worker/task_registry.py`. Описание: Место для реализации и регистрации бизнес-логики конкретных задач.
*   2.1.5. (pending) Создать файл `celery_worker/requirements.txt` с полным набором зависимостей.
    ```
    celery
    redis
    pydantic-settings
    httpx
    # Добавьте все остальные библиотеки, необходимые для выполнения бизнес-логики
    ```
*   2.1.6. (pending) Создать файл `celery_worker/start_worker.sh`. Скрипт для запуска worker-а.
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
*   3.1.1. (pending) Создать файл `celery_beat/celery_app.py`. Описание: Легковесная инициализация Celery-приложения для beat-а.
    ```python
    # celery_beat/celery_app.py
    from celery import Celery
    from .config import settings

    celery_app = Celery("celery_beat", broker=settings.CELERY_BROKER_URL)
    celery_app.config_from_object('celery_beat.config')
    # Celery Beat не импортирует задачи, он получает их имена из БД.
    celery_app.conf.update(
        CELERY_TIMEZONE = settings.CELERY_TIMEZONE,
        CELERY_BEAT_SCHEDULER = settings.CELERY_BEAT_SCHEDULER,
        CELERY_BEAT_SCHEDULE_FILENAME = '/tmp/celerybeat-schedule' # Файл для PersistentScheduler
    )
    ```
*   3.1.2. (pending) Создать файл `celery_beat/config.py`. Описание: Минимальная конфигурация для beat-а.
    ```python
    # celery_beat/config.py
    from pydantic_settings import BaseSettings, SettingsConfigDict
    import os

    class BeatSettings(BaseSettings):
        CELERY_BROKER_URL: str = "redis://redis:6379/0"
        CELERY_BEAT_SCHEDULER: str = "celery.beat.PersistentScheduler"
        CELERY_BEAT_DB_URL: str # URL к PostgreSQL для хранения расписания
        CELERY_TIMEZONE: str = "Europe/Moscow" # Часовой пояс для beat

        model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    settings = BeatSettings()
    ```
*   3.1.3. (pending) Создать файл `celery_beat/requirements.txt` с минимальными зависимостями.
    ```
    celery
    redis
    pydantic-settings
    psycopg2-binary # Драйвер для PostgreSQL
    sqlalchemy # Часто требуется для PersistentScheduler
    ```
*   3.1.4. (pending) Создать файл `celery_beat/start_beat.sh`. Скрипт для запуска beat-а.
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

*   4.1. (pending) Адаптировать `backend/app/core/config.py` для взаимодействия с Celery. Описание: В конфигурации `backend` теперь должна присутствовать `CELERY_BROKER_URL` для корректной работы локального Celery-клиента. Также остаются `FLOWER_API_URL` и `CELERY_WORKER_API_KEY`.
    ```python
    # backend/app/core/config.py (в классе Settings)
    from pydantic_settings import BaseSettings, SettingsConfigDict

    class Settings(BaseSettings):
        # ... другие настройки бэкенда ...
        CELERY_BROKER_URL: str = "redis://redis:6379/0" # URL брокера для локального клиента
        FLOWER_API_URL: str = "http://flower-service:5555" # URL для обращения к Flower
        CELERY_WORKER_API_KEY: str # API-ключ для авторизации worker-а

        model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    settings = Settings()
    ```
*   4.2. (pending) Создать файл `backend/app/core/celery_client.py` и модифицировать эндпоинты в `backend/` для постановки задач.
    *   **Описание:** `backend` будет использовать свой собственный, локально определенный Celery-клиент для отправки задач в очередь.
    ```python
    # backend/app/core/celery_client.py
    from celery import Celery
    from .config import settings

    celery_client = Celery(
        'backend_client',
        broker=settings.CELERY_BROKER_URL,
        backend=None, # Бэкенду не нужно читать результаты напрямую
        include=[] # Убедимся, что он не ищет и не загружает никакие задачи
    )
    ```
    *   **Пример реализации (псевдокод) для ручного запуска в FastAPI эндпоинте:**
        ```python
        # backend/app/api/v1/tasks.py (пример нового эндпоинта)
        from fastapi import APIRouter, Depends, HTTPException, status
        from sqlalchemy.ext.asyncio import AsyncSession
        from backend.app.db.dependencies import get_async_session
        from backend.app.models.task_execution import TaskExecution
        from backend.app.schemas.task_execution import TaskExecutionCreate
        from backend.app.core.celery_client import celery_client # Импорт локального клиента
        from uuid import uuid4

        router = APIRouter()

        @router.post("/run-manual-task", status_code=status.HTTP_202_ACCEPTED)
        async def run_manual_task(
            task_data: TaskExecutionCreate,
            current_user: User = Depends(get_current_user),
            session: AsyncSession = Depends(get_async_session)
        ):
            execution_id = uuid4()
            db_task_execution = TaskExecution(
                id=execution_id,
                task_type=task_data.task_type,
                params=task_data.params,
                triggered_by="USER",
                trigger_source="MANUAL_UI",
                created_by=current_user.id,
                status="PENDING"
            )
            session.add(db_task_execution)
            await session.commit()
            await session.refresh(db_task_execution)

            celery_client.send_task(
                "tasks.dispatch", # Имя задачи-диспетчера в celery_worker
                kwargs={
                    "task_type": task_data.task_type,
                    "execution_id": str(execution_id),
                    **task_data.params
                }
            )
            return {"message": "Задача успешно поставлена в очередь", "execution_id": execution_id}
        ```
    *   **Важно:** Такой подход обеспечивает полную одностороннюю независимость `backend` от кода `celery_worker` и `celery_beat`. `backend` общается с ними исключительно через брокер сообщений.

*   4.3. (pending) Добавить модели БД `TaskSchedule` и `TaskExecution` в `backend/app/db/models/`. Описание: Этот пункт остается без изменений, за исключением того, что ссылки на `tasks_service` теперь будут уточнены как `celery_worker` или `celery_beat` при необходимости.

*   4.4. (pending) Реализовать внутренние API-эндпоинты в `backend/app/api/v1/internal.py` для `celery_worker`. Описание: Эндпоинты, предоставляющие чувствительные данные (например, LDAP-пароль) и функциональность для управления `TaskExecution`, будут использоваться `celery_worker` и защищены `CELERY_WORKER_API_KEY`.

*   4.5. (pending) Обновить `backend/start.sh` для запуска только основного FastAPI-бэкенда.
*   4.5. (pending) Реализация дашборда статусов Celery.
    *   **Описание:** Для отображения статусов Celery Worker-ов и активных задач будет реализован внутренний API-эндпоинт в FastAPI. Этот эндпоинт будет агрегировать информацию, полученную из Flower API, и предоставлять её для дашборда.
    *   **Подробное описание:**
        *   **FastAPI как прокси для Flower:** FastAPI будет выступать в роли прокси для Flower API, делая запросы к нему и обрабатывая полученные данные. Это позволяет централизовать доступ к информации о Celery через FastAPI и применять к нему существующие механизмы аутентификации и авторизации.
        *   **Получаемые метрики:** Количество воркеров, их статус, активные задачи.
        *   **Интеграция с Flower:** FastAPI-бэкенд будет выполнять HTTP-запросы к Flower API (доступному по `FLOWER_API_URL`).
    *   **Пример реализации эндпоинта в FastAPI:**
        ```python
        # backend/app/api/v1/metrics.py (или другой подходящий модуль)
        from fastapi import APIRouter, Depends, HTTPException, status
        from typing import Dict, Any
        from backend.app.core.config import settings
        import httpx
        import logging

        logger = logging.getLogger(__name__)
        router = APIRouter()

        @router.get(
            "/celery/dashboard_status",
            response_model=Dict[str, Any],
            status_code=status.HTTP_200_OK,
            tags=["Metrics"]
        )
        async def get_celery_dashboard_status():
            """
            Предоставляет агрегированный статус Celery Worker-ов и активных задач для дашборда.
            Информация извлекается из Flower API.
            """
            flower_url = settings.FLOWER_API_URL
            if not flower_url:
                logger.error("FLOWER_API_URL не настроен.")
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="URL Flower API не настроен в бэкенде.",
                )

            async with httpx.AsyncClient() as client:
                try:
                    workers_response = await client.get(f"{flower_url}/api/workers", timeout=5.0)
                    workers_response.raise_for_status()
                    workers_data = workers_response.json()

                    active_tasks_response = await client.get(f"{flower_url}/api/tasks?state=ACTIVE", timeout=5.0)
                    active_tasks_response.raise_for_status()
                    active_tasks_data = active_tasks_response.json()

                    return {
                        "num_workers": len(workers_data),
                        "worker_statuses": {w: i.get("status", "unknown") for w, i in workers_data.items()},
                        "active_tasks_count": len(active_tasks_data),
                        "flower_api_status": "ok"
                    }

                except (httpx.HTTPStatusError, httpx.RequestError) as e:
                    logger.error(f"Ошибка при запросе к Flower API: {e}")
                    raise HTTPException(
                        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                        detail=f"Не удалось получить данные от Flower API.",
                    )
        ```
    *   **Настройка маршрутизатора:** Этот маршрутизатор должен быть включен в основное FastAPI-приложение.

---

## 5. Рекомендации по Контейнеризации

*   5.1. (pending) Описать рекомендации по контейнеризации (FastAPI, Celery Worker, Celery Beat, Flower, Redis, PostgreSQL), с учетом строгого разделения.
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
