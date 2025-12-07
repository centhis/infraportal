# Обзор Бэкенда

Бэкенд проекта Infraportal разработан на Python с использованием фреймворка FastAPI. Он предоставляет RESTful API для взаимодействия с фронтендом и управляет всей бизнес-логикой, доступом к данным и безопасностью.

## Ключевые Технологии

*   **FastAPI**: Современный, быстрый (высокопроизводительный) веб-фреймворк для создания API на Python.
*   **SQLAlchemy**: Мощный инструментарий SQL ORM (Object Relational Mapper) для взаимодействия с базой данных.
*   **Alembic**: Инструмент для миграции баз данных, используемый для управления изменениями схемы базы данных.
*   **JWT (JSON Web Tokens)**: Используются для аутентификации пользователей.
-   **PostgreSQL**: Реляционная база данных для хранения данных приложения.

## Структура Бэкенда

Основная структура проекта находится в директории `backend/app/`.

## Настройка окружения для разработки

В проекте используется `uv` в качестве менеджера пакетов и виртуальных окружений. Это современный и очень быстрый инструмент, написанный на Rust.

### 1. Установка `uv`

Если у вас еще не установлен `uv`, выполните следующую команду в терминале:
```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

### 2. Создание и активация виртуального окружения

Находясь в директории `backend/`, создайте виртуальное окружение:
```bash
# Создаст .venv в текущей директории
uv venv
```

Активируйте созданное окружение:
```bash
# Для Linux и macOS
source .venv/bin/activate
```

### 3. Установка зависимостей

После активации окружения установите все зависимости, указанные в `pyproject.toml`:
```bash
# Синхронизирует ваше окружение с зависимостями из pyproject.toml
# Используйте `uv pip sync` вместо устаревшего `uv sync`
uv pip sync
```

### 4. Управление зависимостями

-   **Добавление новой зависимости**:
    ```bash
    # Пример установки новой библиотеки. uv автоматически добавит ее в pyproject.toml
    uv add "some-new-package==1.2.3"
    ```

-   **Обновление зависимостей**:
    После ручного изменения `pyproject.toml` повторно выполните `uv pip sync`, чтобы привести окружение в соответствие.

## Архитектурная схема

Ниже представлена высокоуровневая схема архитектуры бэкенда, показывающая основные компоненты и их зависимости.

```mermaid
graph TD
    subgraph "Точка входа и Конфигурация"
        Main["main.py (Точка входа)<br>Инициализация FastAPI, подключение роутеров"]
        Settings["core/config.py (Конфигурация)<br>Загрузка настроек из .env"]
        InitialData["core/initial_data_loader.py (Загрузчик данных)<br>Начальное наполнение БД"]
    end

    subgraph "Слой API (app/api/v1)"
        APIRouters["Роутеры (*.py)<br>Определение эндпоинтов, валидация запросов"]
        Dependencies["auth/dependencies.py (Зависимости)<br>get_current_user, permission_checker"]
    end

    subgraph "Сервисный слой (Бизнес-логика)"
        AuthService["auth/services.py<br>Логика аутентификации"]
        UserServices["users/.../services.py<br>CRUD-операции для пользователей, групп, ролей"]
    end

    subgraph "Слой доступа к данным"
        SQLAlchemySession["db/database.py (Сессия БД)<br>Управление сессиями и транзакциями"]
        Alembic["alembic/env.py (Миграции)<br>Управление схемой БД"]
        Models[".../models.py (Модели ORM)<br>Определение таблиц и связей"]
    end

    %% Зависимости
    Main --> Settings
    Main --> APIRouters
    Main --> InitialData

    InitialData --> Models

    APIRouters --> Dependencies
    APIRouters --> UserServices
    APIRouters --> AuthService
    APIRouters --> SQLAlchemySession

    Dependencies --> Settings
    Dependencies --> AuthService

    AuthService --> Models
    AuthService --> SQLAlchemySession
    UserServices --> Models
    UserServices --> SQLAlchemySession

    Alembic --> Models
    Alembic --> Settings
end
```

## Разделы Документации Бэкенда

Ниже представлены ссылки на детальную документацию по различным аспектам бэкенда:

*   [API и Маршрутизация](api.md)
*   [Аутентификация и Авторизация](auth.md)
*   [Ядро Приложения (Core)](core.md)
*   [База Данных и Модели](db.md)
*   [Управление Пользователями](users.md)
*   [Тестирование Бэкенда](testing.md)
