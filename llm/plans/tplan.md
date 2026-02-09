# Детальный план работ по реализации новой функциональности: Интеграция Celery

Данный документ описывает детальный план по интеграции асинхронного выполнения задач с использованием Celery, Celery Beat и Redis в проект. Особое внимание уделяется чистоте архитектуры путем выделения Celery-компонентов в отдельный логический сервис (`tasks_service`), разделению зависимостей для каждого контейнера и использованию PostgreSQL для динамического управления расписанием Celery Beat. План включает шаги по созданию необходимой структуры файлов, настройке компонентов Celery, интеграции с основным FastAPI-бэкендом и рекомендации по контейнеризации для эффективного развертывания.

## 1. Асинхронное выполнение задач с Celery (Celery, Celery Beat, Redis, PostgreSQL)

### 1.1. Создание базовой структуры `tasks_service`
*   1.1.1. (pending) Создать новую корневую папку `tasks_service/`. Описание: директория инфраструктурного сервиса асинхронных задач, включающего Celery Worker и Celery Beat, где:
    - Celery Beat отвечает только за публикацию задач по расписанию
    - Celery Worker содержит бизнес-логику и динамическую маршрутизацию задач 
Эта директория будет находиться на том же уровне, что и папка `backend/`, обеспечивая четкое логическое разделение основного FastAPI-бэкенда и асинхронного `tasks_service`.
*   1.1.2. (pending) Создать файл `tasks_service/__init__.py`. Описание: Файл используется для объявления `tasks_service` как Python-пакета. Это необходимо для корректной инициализации Celery-приложения и обеспечения разделения логики: Celery Beat будет использовать его для автообнаружения только задачи-диспетчера, а Celery Worker — для доступа к бизнес-логике задач.

### 1.2. Файлы `tasks_service/` (Компоненты Celery)
*   1.2.1. (pending) Создать файл `tasks_service/celery_app.py`. Описание: Инициализация основного экземпляра Celery-приложения. Будет настроен брокер сообщений (Redis) и бэкенд для хранения результатов (также Redis).
    *   **Подробное описание:** Этот файл будет содержать код для создания и настройки объекта Celery-приложения. Здесь будет указан брокер сообщений (Redis) и бэкенд для хранения результатов (также Redis). Он также будет импортировать задачи, определенные в `tasks.py`.
    *   **Пример содержания:**
        ```python
        # tasks_service/celery_app.py
        from celery import Celery
        from .config import settings

        celery_app = Celery(
            "tasks_service", # Имя приложения
            broker=settings.CELERY_BROKER_URL,
            backend=settings.CELERY_RESULT_BACKEND
        )
        celery_app.config_from_object('tasks_service.config') # Загрузка конфигурации из tasks_service/config.py
        # celery_app.autodiscover_tasks(['tasks_service.tasks']) # Альтернатива CELERY_IMPORTS, если не указано в config.py
        ```
        - Celery-приложение регистрирует только инфраструктурную задачу-диспетчер
        - бизнес-задачи не регистрируются как отдельные Celery tasks
*   1.2.2. (pending) Создать файл `tasks_service/tasks.py`. Описание: Определение единственной Celery-задачи-диспетчера, которая:
    - принимает идентификатор типа задачи и параметры
    - выполняет маршрутизацию на конкретную бизнес-логику внутри worker
    - является единственной задачей, известной Celery Beat
    при этом:
    - запрещено добавлять новые Celery-задачи для бизнес-логики
    - новые типы задач реализуются внутри worker, а не как новые Celery tasks
    *   **Подробное описание:** В этом файле будет определена **единственная** функция-диспетчер, которая будет выполнять маршрутизацию на соответствующую бизнес-логику. Она будет декорирована `@celery_app.task`.
    *   **Пример содержания:**
        ```python
        # tasks_service/tasks.py
        import logging
        from typing import Any, Optional
        import httpx # Для вызова внутреннего API бэкенда
        from .celery_app import celery_app
        from .config import settings

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
            Это единственная задача, известная Celery Beat.
            """
            current_task_type = task_type
            current_execution_id = execution_id
            current_kwargs = kwargs

            if schedule_id:
                logger.info(f"Получена запланированная задача с schedule_id='{schedule_id}'. Обращаемся к бэкенду за execution_id и параметрами.")
                try:
                    # Шаг 3: Worker вызывает backend (internal API)
                    # Используем httpx для синхронного вызова, так как celery task синхронна.
                    # В реальной реализации можно использовать асинхронный httpx и asyncio,
                    # если Celery worker настроен на использование eventlet/gevent.
                    headers = {"X-API-Key": settings.CELERY_WORKER_API_KEY}
                    response = httpx.post(
                        f"{settings.BACKEND_INTERNAL_API_URL}/task_execution",
                        json={"schedule_id": schedule_id},
                        headers=headers,
                        timeout=10.0 # Таймаут для запроса к бэкенду
                    )
                    response.raise_for_status() # Вызовет исключение для статусов 4xx/5xx

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

            # Шаг 4: Worker выполняет бизнес-логику
            # Здесь происходит маршрутизация на реальные обработчики
            from tasks_service.task_registry import get_task_handler
            handler = get_task_handler(current_task_type)
            if handler:
                try:
                    # Передаем execution_id в обработчик, чтобы он мог обновлять статус и писать события
                    result = handler(execution_id=current_execution_id, **current_kwargs)
                    logger.info(f"Задача task_type='{current_task_type}' (execution_id='{current_execution_id}') завершена успешно.")
                    return result
                except Exception as e:
                    logger.error(f"Ошибка при выполнении задачи task_type='{current_task_type}' (execution_id='{current_execution_id}'): {e}", exc_info=True)
                    # Здесь можно отправить запрос в бэкенд об ошибке выполнения
                    raise e
            else:
                logger.error(f"Обработчик для task_type '{current_task_type}' не найден (execution_id='{current_execution_id}').")
                # Здесь также можно отправить запрос в бэкенд об ошибке
                raise ValueError(f"Обработчик для task_type '{current_task_type}' не найден.")
        ```
*   1.2.3. (pending) Создать файл `tasks_service/config.py`. Описание: Специфичные настройки Celery, включая URL Redis для брокера сообщений и бэкенда результатов, часовой пояс, сериализаторы. Также будут добавлены настройки для динамического планировщика Celery Beat, использующего PostgreSQL.
    *   **Подробное описание:** Здесь будут храниться все конфигурационные параметры, необходимые для работы Celery, включая URL Redis для брокера сообщений и бэкенда результатов. Также будут определены параметры для Celery Beat, который будет использовать PostgreSQL для хранения расписания. **Настройки будут централизованно браться из переменных окружения и `.env` файла, аналогично подходу, используемому в `backend`, с помощью `Pydantic-settings` для удобного и безопасного управления конфигурацией.**
    *   **Пример содержания:**
        ```python
        # tasks_service/config.py
        from pydantic_settings import BaseSettings, SettingsConfigDict
        import os

        class CelerySettings(BaseSettings):
            # Настройки брокера и бэкенда результатов
            CELERY_BROKER_URL: str = "redis://redis:6379/0" # Имя хоста 'redis' для Docker Compose
            CELERY_RESULT_BACKEND: str = "redis://redis:6379/0"

            # Общие настройки Celery
            CELERY_TIMEZONE: str = "Europe/Moscow" # Пример часового пояса
            CELERY_ENABLE_UTC: bool = True # Использовать UTC для работы со временем
            CELERY_ACCEPT_CONTENT: list[str] = ['json'] # Разрешенные типы контента для сообщений
            CELERY_TASK_SERIALIZER: str = 'json' # Сериализатор для задач
            CELERY_RESULT_SERIALIZER: str = 'json' # Сериализатор для результатов
            CELERY_IMPORTS: list[str] = ["tasks_service.tasks"] # Модули, где Celery будет искать задачи

            # Настройки для динамического планировщика Celery Beat через БД
            # Используется PersistentScheduler, который позволяет хранить расписание в базе данных.
            # Если вы используете специализированный шедулер (например, 'django_celery_beat.schedulers.DatabaseScheduler'),
            # укажите его здесь. Для FastAPI проектов, можно использовать SQLAlchemy-based PersistentScheduler
            # или реализовать свой.
            CELERY_BEAT_SCHEDULER: str = "celery.beat.PersistentScheduler"
            # Строка подключения к PostgreSQL для Celery Beat.
            # Убедитесь, что эта база данных доступна контейнеру Celery Beat.
            # Значение по умолчанию берется из переменной окружения CELERY_BEAT_DB_URL,
            # что позволяет легко настроить подключение в Docker Compose или .env файле.
            CELERY_BEAT_DB_URL: str = os.getenv("CELERY_BEAT_DB_URL", "postgresql://user:password@db_host:5432/db_name")

            # Настройки для защищенного внутреннего API бэкенда
            BACKEND_INTERNAL_API_URL: str = "https://backend-service:8000/internal/v1" # URL внутреннего API FastAPI
            CELERY_WORKER_API_KEY: str # API-ключ для аутентификации в внутреннем API бэкенда

            model_config = SettingsConfigDict(env_file=".env", extra="ignore")

        settings = CelerySettings()
        ```
*   1.2.4. (pending) Добавить структуру папок для логического разделения задач по модулям бэкенда.
    *   **Описание:** В `tasks_service/` будет создана папка `handlers/`, которая будет содержать подпапки, соответствующие логическим модулям бэкенда (например, `ldap_sync/`, `user_management/`, `notification/`). Каждая такая подпапка будет содержать файлы с реализациями конкретных бизнес-задач (хендлеров). Это позволит логически разделить и организовать множество задач, которые будут вызываться через диспетчер `tasks.dispatch`.
    *   **Пример структуры:**
        ```
        tasks_service/
        └── handlers/
            ├── __init__.py
            ├── ldap_sync/
            │   ├── __init__.py
            │   └── sync_handler.py    # Реализация задачи "sync_ldap"
            ├── user_management/
            │   ├── __init__.py
            │   └── create_user_handler.py
            └── notification/
                ├── __init__.py
                └── send_email_handler.py
        ```
    *   **Дополнительный модуль:** Создать файл `tasks_service/task_registry.py`, который будет отвечать за регистрацию и предоставление доступа к обработчикам задач (хендлерам). Он будет содержать механизм сопоставления `task_type` с соответствующим хендлером.
*   1.2.5. (pending) Создать файл `tasks_service/task_registry.py`. Описание: Этот файл будет содержать механизм регистрации и получения обработчиков задач.
    *   **Подробное описание:** `task_registry.py` будет предоставлять функции для регистрации функций-обработчиков (хендлеров) для различных `task_type`. Эти хендлеры будут вызываться диспетчером `tasks.dispatch` на основе переданного `task_type`.
    *   **Пример содержания:**
        ```python
        # tasks_service/task_registry.py
        from typing import Callable, Dict, Any

        _task_handlers: Dict[str, Callable[..., Any]] = {}

        def register_task_handler(task_type: str, handler: Callable[..., Any]):
            """
            Регистрирует функцию-обработчик для заданного типа задачи.
            """
            if task_type in _task_handlers:
                raise ValueError(f"Обработчик для task_type '{task_type}' уже зарегистрирован.")
            _task_handlers[task_type] = handler

        def get_task_handler(task_type: str) -> Callable[..., Any]:
            """
            Возвращает зарегистрированный обработчик для заданного типа задачи.
            """
            handler = _task_handlers.get(task_type)
            if not handler:
                # В реальном приложении можно предусмотреть более сложную логику
                # Например, динамическую загрузку обработчиков или возвращение обработчика по умолчанию
                raise ValueError(f"Обработчик для task_type '{task_type}' не найден.")
            return handler

        # Пример регистрации обработчика (в реальном приложении это будет происходить
        # в соответствующих модулях обработчиков, например, в ldap_sync/sync_handler.py)
        # from .handlers.ldap_sync.sync_handler import handle_ldap_sync
        # register_task_handler("sync_ldap", handle_ldap_sync)
        ```


### 1.3. Скрипты запуска `tasks_service`
*   1.3.1. (pending) Создать файл `tasks_service/start_worker.sh`. Описание: Bash-скрипт для запуска Celery worker. Этот скрипт будет отвечать за инициализацию виртуального окружения, установку `PYTHONPATH` и запуск Celery worker в фоновом режиме или как основной процесс контейнера.
    *   **Подробное описание:** Скрипт устанавливает `PYTHONPATH`, чтобы Celery мог найти `tasks_service` и его модули, а затем запускает Celery worker. Флаг `--loglevel=info` устанавливает уровень логирования. В продакшене рекомендуется использовать флаг `-P prefork` или `-P gevent` для распараллеливания, вместо `-P solo`, который хорош для отладки.
    *   **Пример содержания:**
        ```bash
        #!/bin/bash
        # tasks_service/start_worker.sh
        # Убедиться, что корневая папка проекта (где находится tasks_service) добавлена в PYTHONPATH.
        # Это необходимо, чтобы Python мог импортировать tasks_service.
        export PYTHONPATH=$(pwd):$PYTHONPATH
        echo "Запуск Celery Worker..."
        exec celery -A tasks_service.celery_app worker --loglevel=info -P prefork # -P prefork для продакшена, -P solo для отладки
        ```
*   1.3.2. (pending) Создать файл `tasks_service/start_beat.sh`. Описание: Bash-скрипт для запуска Celery Beat. Celery Beat запускается с минимальным Celery-приложением, содержащим только инфраструктурную задачу-диспетчер `tasks.dispatch`. Контейнер Celery Beat является статичным, не требует обновления при добавлении новых бизнес-задач, и его ответственность ограничена: чтением расписания из PostgreSQL и публикацией инфраструктурной задачи-диспетчера в брокер сообщений. Также учесть передачу настроек подключения к БД.
    *   **Подробное описание:** Скрипт устанавливает `PYTHONPATH` и запускает Celery Beat. Важно, чтобы Celery Beat имел доступ к `CELERY_BEAT_DB_URL` для чтения расписания из PostgreSQL. Эта переменная окружения должна быть доступна скрипту, например, через Docker Compose.
    *   **Пример содержания:**
        ```bash
        #!/bin/bash
        # tasks_service/start_beat.sh
        # Убедиться, что корневая папка проекта (где находится tasks_service) добавлена в PYTHONPATH.
        export PYTHONPATH=$(pwd):$PYTHONPATH
        echo "Запуск Celery Beat..."
        # Передаем URL базы данных как переменную окружения.
        # Это может быть установлено в Docker Compose или .env файле, который читает config.py
        # Например: export CELERY_BEAT_DB_URL="postgresql://user:password@db_host:5432/db_name"
        exec celery -A tasks_service.celery_app beat --loglevel=info
        ```

### 1.4. Интеграция с Основным FastAPI-бэкендом (`backend/`)
*   1.4.1. (pending) Убедиться, что `backend/app/core/config.py` не содержит специфичных для Celery настроек. Описание: Проверить `backend/app/core/config.py` и удалить любые упоминания о Celery-брокере или бэкенде, чтобы сохранить чистоту конфигурации основного FastAPI-бэкенда. Все настройки, относящиеся к Celery, теперь должны быть централизованы в `tasks_service/config.py`. Однако, `backend/app/core/config.py` будет содержать `FLOWER_API_URL` для взаимодействия с Flower API, а также `CELERY_WORKER_API_KEY` и `LDAP_PASSWORD` для внутреннего API.
*   1.4.2. (pending) Добавить отдельные файлы зависимостей. Описание: Создать `tasks_service/pyproject.toml` для Celery и обновить `backend/pyproject.toml` для FastAPI.
    *   **Подробное описание `tasks_service/pyproject.toml`:** Этот файл будет содержать только зависимости, необходимые для работы Celery worker и Celery Beat. Это включает `celery`, `redis` (или `redis-py` для подключения к брокеру Redis), драйвер PostgreSQL (например, `psycopg2-binary` или `asyncpg` для подключения к БД расписаний Celery Beat), и, при необходимости, библиотеку для работы с динамическим планировщиком Celery Beat (например, `SQLAlchemy` если `PersistentScheduler` его использует, или `django-celery-beat` если используется его шедулер).
    *   **Подробное описание `backend/pyproject.toml`:** Этот файл будет содержать зависимости, необходимые для основного FastAPI-приложения (FastAPI, Uvicorn, SQLAlchemy, Pydantic, httpx и т.д.). **Он также должен включать `celery` (для использования Celery-клиента) и `httpx`, поскольку FastAPI-бэкенд будет ставить Celery-задачи в очередь, а также взаимодействовать с Flower API и внутренними эндпоинтами. Важно:** `backend` не должен импортировать компоненты `tasks_service` напрямую для вызова задач; вместо этого задачи ставятся в очередь через Celery-клиент. Также важно, чтобы этот `pyproject.toml` не включал лишние зависимости, необходимые только для выполнения задач.
```
*   1.4.3. (pending) Обновить `backend/start.sh` для запуска только основного FastAPI-бэкенда. Описание: Этот скрипт теперь должен запускать только FastAPI-приложение (например, с использованием `uvicorn` или `gunicorn` + `uvicorn.workers.UvicornWorker`). Запуск Celery worker и Celery Beat будет осуществляться отдельными скриптами (`tasks_service/start_worker.sh`, `tasks_service/start_beat.sh`) в их собственных контейнерах.
*   1.4.4. (pending) Модифицировать эндпоинты в `backend/app/api/v1/` для постановки задач через Celery-клиент.
    *   **Описание:** В FastAPI-эндпоинтах, где требуется асинхронное выполнение, FastAPI инициирует выполнение задач путём постановки инфраструктурной задачи-диспетчера в очередь Celery (через Celery-клиент). Логика различается для ручного и запланированного запуска:
        *   **Ручной запуск (Manual Run):** UI инициирует запрос к бэкенду. Бэкенд создает новую запись `TaskExecution` в БД, устанавливая `triggered_by='USER'`, `trigger_source='MANUAL_UI'` и сохраняя переданные параметры. Затем бэкенд немедленно отправляет задачу в очередь Celery, передавая `execution_id` и `task_type`, а также исходные параметры.
        *   **Запланированный запуск (Scheduled Run):** UI (или другой механизм) создает/обновляет запись `TaskSchedule` в БД. Celery Beat читает расписание из этой таблицы. Когда приходит время запуска, Beat публикует инфраструктурную задачу-диспетчера в очередь Celery, передавая только `schedule_id`. Worker, получив эту задачу, обращается к бэкенду (внутренний API) для создания `TaskExecution` и получения актуальных параметров задачи.
    *   **Пример реализации (псевдокод) для ручного запуска в FastAPI эндпоинте:**
        ```python
        # backend/app/api/v1/tasks.py (пример нового эндпоинта)
        from fastapi import APIRouter, Depends, HTTPException, status
        from sqlalchemy.ext.asyncio import AsyncSession
        from backend.app.db.dependencies import get_async_session
        from backend.app.models.task_execution import TaskExecution  # Предполагаем, что модель TaskExecution находится здесь
        from backend.app.schemas.task_execution import TaskExecutionCreate # Схема для создания
        from backend.app.core.celery_client import celery_client # Импорт локального клиента 
        from uuid import uuid4

        router = APIRouter()

        @router.post("/run-manual-task", status_code=status.HTTP_202_ACCEPTED)
        async def run_manual_task(
            task_data: TaskExecutionCreate, # Схема должна содержать task_type и params
            current_user: User = Depends(get_current_user), # Пример получения текущего пользователя
            session: AsyncSession = Depends(get_async_session)
        ):
            # 1. Создание записи TaskExecution в БД
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

            # 2. Отправка задачи в Celery с execution_id
            tasks_celery_app.send_task(
                "tasks.dispatch",
                kwargs={
                    "task_type": task_data.task_type,
                    "execution_id": str(execution_id),
                    **task_data.params # Передаем параметры задачи
                }
            )
            return {"message": "Задача успешно поставлена в очередь", "execution_id": execution_id}
        ```
    *   

*   1.4.5. (pending) Создание внутренних защищенных API-эндпоинтов для Celery Worker.
    *   **Описание:** Реализовать в FastAPI внутренние эндпоинты, которые будут предоставлять чувствительные данные (например, пароль LDAP) и функциональность для управления `TaskExecution` исключительно для авторизованных Celery Worker-ов. Эти эндпоинты будут защищены с использованием `CELERY_WORKER_API_KEY`.
    *   **Подробное описание:**
        *   **Аутентификация:** Использовать API-ключ (`CELERY_WORKER_API_KEY`), который передается Worker-ом в заголовке `X-API-Key`. FastAPI будет проверять этот ключ с использованием `fastapi.security.api_key.APIKeyHeader` и кастомной зависимости.
        *   **Авторизация:** Проверять валидность API-ключа. При необходимости можно добавить более гранулированную авторизацию на основе `secret_id` или других параметров.
        *   **Получение секрета FastAPI-бэкендом:** FastAPI-бэкенд сам не должен хранить чувствительные данные. Он должен получать их из своего безопасного источника (например, из переменных окружения, Docker secrets или Kubernetes secrets, доступных только ему) непосредственно перед отдачей Worker-у.
        *   **Транспортная безопасность:** Эндпоинт должен быть доступен исключительно по HTTPS.
        *   **Логирование:** Логировать попытки доступа к эндпоинту, но **никогда не логировать сами секреты**.
    *   **Пример реализации в FastAPI (`backend/app/api/v1/internal.py`):**
        ```python
        # backend/app/api/v1/internal.py
        from fastapi import APIRouter, Depends, HTTPException, status, Security
        from fastapi.security.api_key import APIKeyHeader
        from typing import Dict, Any, Optional
        from backend.app.core.config import settings # Предполагаем, что CELERY_WORKER_API_KEY и LDAP_PASSWORD тут
        from backend.app.db.dependencies import get_async_session
        from backend.app.models.task_schedule import TaskSchedule
        from backend.app.models.task_execution import TaskExecution
        from backend.app.schemas.task_execution import TaskExecutionCreateInternal # Схема для внутреннего создания TaskExecution
        from sqlalchemy.ext.asyncio import AsyncSession
        from sqlalchemy.future import select
        from uuid import uuid4
        import logging

        logger = logging.getLogger(__name__)

        router = APIRouter()
        api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)

        async def verify_worker_api_key(api_key: str = Security(api_key_header)):
            """Зависимость для проверки API-ключа Celery Worker."""
            if not api_key:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Не предоставлен API-ключ для Celery Worker",
                )
            if api_key == settings.CELERY_WORKER_API_KEY:
                return api_key
            logger.warning("Попытка доступа к внутреннему API с неверным API-ключом.")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Недействительный API-ключ для Celery Worker",
            )

        # Пример безопасного получения LDAP-пароля (FastAPI-бэкенд сам не должен его хранить)
        def get_ldap_password_securely() -> str:
            # В реальном приложении:
            # - Чтение из переменной окружения (например, settings.LDAP_PASSWORD)
            # - Чтение из Docker Secret / Kubernetes Secret
            # Для примера:
            password = settings.LDAP_PASSWORD # Предполагаем, что это надежно загружено из env/secrets
            if not password:
                logger.error("LDAP-пароль не настроен в конфигурации бэкенда.")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="LDAP-пароль не доступен в бэкенде.",
                )
            return password

        @router.get(
            "/secrets/ldap_password",
            response_model=Dict[str, str],
            status_code=status.HTTP_200_OK,
            dependencies=[Depends(verify_worker_api_key)], # Защита эндпоинта
            tags=["Internal"]
        )
        async def get_ldap_password_for_worker():
            """
            Предоставляет LDAP-пароль исключительно для авторизованных Celery Worker-ов.
            Пароль запрашивается Worker-ом по мере необходимости и немедленно очищается из памяти.
            """
            logger.info("Запрос LDAP-пароля от авторизованного Celery Worker.")
            ldap_password = get_ldap_password_securely()
            return {"ldap_password": ldap_password}

        @router.post(
            "/task_execution",
            response_model=Dict[str, Any], # execution_id, task_type, params
            status_code=status.HTTP_201_CREATED,
            dependencies=[Depends(verify_worker_api_key)], # Защита эндпоинта
            tags=["Internal"]
        )
        async def create_task_execution_for_worker(
            task_data: TaskExecutionCreateInternal, # Ожидаем schedule_id
            session: AsyncSession = Depends(get_async_session)
        ):
            """
            Создает новую запись TaskExecution по запросу Celery Worker-а
            для запланированной задачи (определенной по schedule_id).
            Возвращает execution_id, task_type и параметры задачи.
            """
            if not task_data.schedule_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Для создания TaskExecution по расписанию требуется 'schedule_id'."
                )

            # 1. Читаем расписание из БД
            schedule_result = await session.execute(
                select(TaskSchedule).filter(TaskSchedule.id == task_data.schedule_id)
            )
            task_schedule = schedule_result.scalars().first()

            if not task_schedule:
                logger.error(f"Расписание с ID '{task_data.schedule_id}' не найдено.")
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Расписание с ID '{task_data.schedule_id}' не найдено."
                )
            if not task_schedule.enabled:
                logger.warning(f"Попытка запустить отключенное расписание с ID '{task_data.schedule_id}'.")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Расписание с ID '{task_data.schedule_id}' отключено."
                )

            # 2. Создаем новую запись TaskExecution
            execution_id = uuid4()
            db_task_execution = TaskExecution(
                id=execution_id,
                schedule_id=task_schedule.id,
                task_type=task_schedule.task_type,
                params=task_schedule.params,
                triggered_by="SYSTEM",
                trigger_source="SCHEDULE",
                created_by=None, # System-triggered tasks have no specific user
                status="PENDING"
            )
            session.add(db_task_execution)
            await session.commit()
            await session.refresh(db_task_execution)

            logger.info(f"Создано TaskExecution '{execution_id}' для расписания '{task_schedule.id}'.")
            return {
                "execution_id": str(execution_id),
                "task_type": task_schedule.task_type,
                "params": task_schedule.params
            }
        ```
    *   **Настройка маршрутизатора:** Этот внутренний маршрутизатор (router) должен быть включен в основное FastAPI-приложение. Возможно, стоит выделить его в отдельный префикс, например `/internal/v1`.
*   1.4.6. (pending) Добавить модели БД для `task_schedule` и `task_execution`, а также соответствующие миграции.
    *   **Описание:** Для обеспечения функциональности динамического планирования Celery Beat и отслеживания выполнений задач, необходимо создать две новые модели в базе данных PostgreSQL: `TaskSchedule` и `TaskExecution`. Эти модели будут храниться в схеме `backend/app/db/models/tasks.py` (новый файл).
    *   **Модель `TaskSchedule`:**
        *   **Поля:**
            *   `id` (UUID, primary key): Уникальный идентификатор расписания.
            *   `task_type` (String): Тип задачи (например, "sync_ldap").
            *   `params` (JSONB): Параметры задачи в формате JSON.
            *   `cron` (String): CRON-выражение для расписания (например, "*/5 * * * *").
            *   `enabled` (Boolean): Флаг активности расписания.
            *   `created_at` (DateTime): Время создания записи.
            *   `updated_at` (DateTime): Время последнего обновления записи.
        *   **Назначение:** Хранит информацию о запланированных задачах, которые Celery Beat будет считывать для публикации инфраструктурных задач-диспетчеров.
    *   **Модель `TaskExecution`:**
        *   **Поля:**
            *   `id` (UUID, primary key): Уникальный идентификатор выполнения задачи (execution_id).
            *   `schedule_id` (UUID, Foreign Key к `TaskSchedule.id`, nullable): Ссылка на расписание, если задача запущена по расписанию.
            *   `task_type` (String): Тип выполненной задачи.
            *   `params` (JSONB): Параметры, с которыми была запущена задача.
            *   `triggered_by` (String): Кто инициировал выполнение (например, "SYSTEM" для Beat, "USER" для ручного запуска).
            *   `trigger_source` (String): Источник запуска (например, "SCHEDULE", "MANUAL_UI").
            *   `created_by` (UUID, Foreign Key к User.id, nullable): Пользователь, который инициировал ручной запуск.
            *   `status` (String): Текущий статус выполнения (например, "PENDING", "RUNNING", "SUCCESS", "FAILED").
            *   `start_time` (DateTime): Время начала выполнения.
            *   `end_time` (DateTime, nullable): Время завершения выполнения.
            *   `log` (JSONB, nullable): Логи выполнения задачи.
            *   `result` (JSONB, nullable): Результат выполнения задачи.
            *   `error_message` (Text, nullable): Сообщение об ошибке, если задача завершилась неудачно.
            *   `created_at` (DateTime): Время создания записи.
            *   `updated_at` (DateTime): Время последнего обновления записи.
        *   **Назначение:** Хранит историю всех выполнений задач, позволяя отслеживать их статус, результаты и связанные данные.
    *   **Миграции:**
        *   Необходимо создать соответствующие миграции Alembic для создания этих двух таблиц в базе данных PostgreSQL.
        *   Пример файла миграции (частично):
            ```python
            # backend/alembic/versions/your_migration_file.py
            from alembic import op
            import sqlalchemy as sa
            from sqlalchemy.dialects import postgresql # Для JSONB и UUID

            def upgrade():
                op.create_table(
                    'task_schedule',
                    sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=sa.text('gen_random_uuid()')),
                    sa.Column('task_type', sa.String, nullable=False),
                    sa.Column('params', postgresql.JSONB, nullable=False, server_default=sa.text("'{}'::jsonb")),
                    sa.Column('cron', sa.String, nullable=False),
                    sa.Column('enabled', sa.Boolean, nullable=False, default=True),
                    sa.Column('created_at', sa.DateTime, server_default=sa.func.now(), nullable=False),
                    sa.Column('updated_at', sa.DateTime, server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False)
                )

                op.create_table(
                    'task_execution',
                    sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=sa.text('gen_random_uuid()')),
                    sa.Column('schedule_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('task_schedule.id'), nullable=True),
                    sa.Column('task_type', sa.String, nullable=False),
                    sa.Column('params', postgresql.JSONB, nullable=False, server_default=sa.text("'{}'::jsonb")),
                    sa.Column('triggered_by', sa.String, nullable=False),
                    sa.Column('trigger_source', sa.String, nullable=False),
                    sa.Column('created_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=True), # Предполагаем наличие таблицы users
                    sa.Column('status', sa.String, nullable=False, default='PENDING'),
                    sa.Column('start_time', sa.DateTime, server_default=sa.func.now(), nullable=False),
                    sa.Column('end_time', sa.DateTime, nullable=True),
                    sa.Column('log', postgresql.JSONB, nullable=True),
                    sa.Column('result', postgresql.JSONB, nullable=True),
                    sa.Column('error_message', sa.Text, nullable=True),
                    sa.Column('created_at', sa.DateTime, server_default=sa.func.now(), nullable=False),
                    sa.Column('updated_at', sa.DateTime, server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False)
                )
                # Добавить индексы, если необходимо
            ```
## 1.5. Реализация дашборда статусов Celery

*   **Описание:** Для отображения статусов Celery Worker-ов и активных задач будет реализован внутренний API-эндпоинт в FastAPI. Этот эндпоинт будет агрегировать информацию, полученную из Flower API, и предоставлять её для дашборда.
*   **Подробное описание:**
    *   **FastAPI как прокси для Flower:** FastAPI будет выступать в роли прокси для Flower API, делая запросы к нему и обрабатывая полученные данные. Это позволяет централизовать доступ к информации о Celery через FastAPI и применять к нему существующие механизмы аутентификации и авторизации (если дашборд доступен неавторизованным пользователям, или требует более высокого уровня доступа).
    *   **Получаемые метрики:**
        *   **Количество воркеров:** Общее количество запущенных Celery Worker-ов.
        *   **Статус воркеров:** Активен/неактивен.
        *   **Активные задачи:** Задачи, которые в данный момент выполняются воркерами.
    *   **Интеграция с Flower:**
        *   FastAPI-бэкенд будет выполнять HTTP-запросы к Flower API (обычно доступен по умолчанию на порту 5555).
        *   **Важно:** Если Flower API защищен (например, Basic Auth), FastAPI должен использовать эти учетные данные.
    *   **Транспортная безопасность:** Коммуникации между FastAPI и Flower должны быть защищены (HTTPS, если Flower настроен с SSL).
    *   **Пример реализации эндпоинта в FastAPI:**

        ```python
        # backend/app/api/v1/metrics.py (или другой подходящий модуль)
        from fastapi import APIRouter, Depends, HTTPException, status
        from typing import Dict, List, Any
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
            flower_url = settings.FLOWER_API_URL # Например, "http://flower-service:5555"

            if not flower_url:
                logger.error("FLOWER_API_URL не настроен.")
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="URL Flower API не настроен в бэкенде.",
                )

            async with httpx.AsyncClient() as client:
                try:
                    # Пример запроса к Flower API для получения информации о воркерах
                    workers_response = await client.get(f"{flower_url}/api/workers", timeout=5.0)
                    workers_response.raise_for_status()
                    workers_data = workers_response.json()

                    # Пример запроса к Flower API для получения активных задач
                    active_tasks_response = await client.get(f"{flower_url}/api/tasks?state=ACTIVE", timeout=5.0)
                    active_tasks_response.raise_for_status()
                    active_tasks_data = active_tasks_response.json()

                    num_workers = len(workers_data)
                    worker_statuses = {}
                    for worker_name, worker_info in workers_data.items():
                        # Flower API может возвращать разные данные, здесь упрощенный пример
                        worker_statuses[worker_name] = "active" if worker_info.get("status") == "online" else "inactive" # Пример
                        # Или более детальный статус на основе других полей

                    active_tasks = []
                    for task_id, task_info in active_tasks_data.items():
                        active_tasks.append({
                            "task_id": task_id,
                            "name": task_info.get("name"),
                            "state": task_info.get("state"),
                            "worker": task_info.get("worker"),
                            "started": task_info.get("started"),
                            # Дополнительные поля, которые могут быть интересны
                        })

                    return {
                        "num_workers": num_workers,
                        "worker_statuses": worker_statuses,
                        "active_tasks": active_tasks,
                        "flower_api_status": "ok"
                    }

                except httpx.HTTPStatusError as e:
                    logger.error(f"Ошибка HTTP при запросе к Flower API: {e.response.status_code} - {e.response.text}")
                    raise HTTPException(
                        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                        detail=f"Не удалось получить данные от Flower API: HTTP {e.response.status_code}",
                    )
                except httpx.RequestError as e:
                    logger.error(f"Ошибка запроса к Flower API: {e}")
                    raise HTTPException(
                        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                        detail=f"Не удалось подключиться к Flower API: {e}",
                    )
        ```
    *   **Настройка маршрутизатора:** Этот маршрутизатор должен быть включен в основное FastAPI-приложение.

*   **Настройка `FLOWER_API_URL` в `backend/app/core/config.py`:**
    *   Необходимо добавить переменную окружения для URL Flower API, чтобы FastAPI мог к нему обращаться.

    ```python
    # backend/app/core/config.py (в классе Settings)
    FLOWER_API_URL: str = "http://flower-service:5555" # URL для обращения к Flower
    ```
### 1.6. Рекомендации по Контейнеризации
*   1.6.1. (pending) Описать рекомендации по контейнеризации (FastAPI, Celery Worker, Celery Beat, Flower, Redis, PostgreSQL), с учетом разделения зависимостей, доступа к общему коду и специфики Celery Beat с БД. Описание: Подробные рекомендации по созданию Docker-контейнеров и конфигурации `docker-compose.yml` для всех сервисов.
    *   **FastAPI Container:**
        *   Dockerfile для создания образа, который запускает `backend/start.sh`.
        *   Устанавливает зависимости из `backend/pyproject.toml`.
        *   Может быть несколько реплик для масштабирования.
    *   **Celery Worker Container:**
        *   Dockerfile для создания образа, который запускает `tasks_service/start_worker.sh`.
        *   Устанавливает зависимости из `tasks_service/pyproject.toml`.
        *   Может быть несколько реплик для параллельного выполнения задач.
    *   **Celery Beat Container:**
        *   Dockerfile для создания образа, который запускает `tasks_service/start_beat.sh`.
        *   Устанавливает зависимости из `tasks_service/pyproject.toml` (включая драйвер PostgreSQL и библиотеки для работы с динамическим планировщиком).
        *   **Ключевой момент:** Контейнер Celery Beat строго статичен и не содержит бизнес-логику. Он не требует изменений при добавлении новых бизнес-задач. Его единственная ответственность — чтение расписания из PostgreSQL и публикация инфраструктурной задачи-диспетчера в брокер сообщений.
        *   Потребуется доступ к PostgreSQL базе данных для чтения расписания (через переменную окружения `CELERY_BEAT_DB_URL` или аналогичную).
        *   Обычно запускается в одной реплике, так как это singleton-сервис.
    *   **Flower Container:**
        *   Dockerfile для создания образа, который запускает Flower.
        *   Flower должен иметь доступ к брокеру Celery (Redis) для мониторинга.
        *   Если Flower API будет доступен извне, его нужно защитить аутентификацией (например, Basic Auth) и HTTPS. Если только внутри сети, то HTTPS все равно желателен.
        *   Настройки (например, `FLOWER_API_URL`) должны быть доступны FastAPI-бэкенду.
    *   **Redis Container:** Использовать официальный образ Redis (например, `redis:latest`) из Docker Hub. Будет выступать в роли брокера сообщений и бэкенда для результатов задач.
    *   **PostgreSQL Container:** Использовать официальный образ PostgreSQL (например, `postgres:latest`) из Docker Hub. Будет использоваться для хранения динамического расписания Celery Beat и, возможно, для основной базы данных FastAPI.
    *   **Docker Compose (`docker-compose.yml`):**
        *   Использовать `docker-compose.yml` для определения и связывания всех этих сервисов (FastAPI, Worker, Beat, Flower, Redis, PostgreSQL).
        *   **Сетевое взаимодействие:** Убедиться, что все сервисы могут общаться друг с другом. В Docker Compose это достигается путем использования имени сервиса в качестве хоста (например, `redis` для Redis, `postgresql` для PostgreSQL в URL подключениях).
        *   **Управление переменными окружения:** Все настройки, как для `backend`, так и для `tasks_service` (включая `CELERY_BROKER_URL`, `CELERY_BEAT_DB_URL`, `FLOWER_API_URL` и другие специфичные для Celery параметры), должны централизованно передаваться в соответствующие контейнеры через переменные окружения, определенные в `docker-compose.yml` или в `.env` файле. Это обеспечивает гибкость и безопасность конфигурации.
        *   **Доступ к общему коду:** Если `tasks_service` импортирует код из `backend/app/` (например, модели базы данных, схемы, утилиты), то при сборке контейнеров необходимо обеспечить доступ к этому коду.
            *   **Рекомендуемый подход:** Создать на корневом уровне папку `shared/` для общих моделей, схем, утилит. Оба `backend` и `tasks_service` будут иметь эту `shared` библиотеку как зависимость (возможно, установленную в режиме editable `pip install -e ./shared`). Это наиболее чистое и масштабируемое решение.
            *   **Для упрощения на начальном этапе (менее чистое):** Скопировать весь проект в оба контейнера (FastAPI и Celery) и явно настроить `PYTHONPATH` в Dockerfile `tasks_service` так, чтобы он включал путь к `backend/app/`.