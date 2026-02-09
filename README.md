# Infraportal

> Infraportal — веб-приложение для управления инфраструктурой. Бэкенд на Python/FastAPI, фронтенд на React/TypeScript.

## 📚 Документация

Подробная документация находится в [`docs/`](./docs/README.md):
- [Бэкенд](docs/backend/overview.md) — архитектура, API, сервисы
- [Фронтенд](docs/frontend/overview.md) — компоненты, состояние, маршрутизация
- [Celery](docs/backend/celery.md) — фоновые задачи

---

## 🚀 Быстрый старт (Docker Compose)

### Предварительные требования

- **Docker** и **Docker Compose** v2+

### 1. Настройка переменных окружения

```bash
cp .env.example .env
```

Отредактируйте `.env`, указав:
- `SECRET_KEY` — уникальный ключ для шифрования (обязательно изменить!)
- `REDIS_PASSWORD` — пароль Redis
- Параметры LDAP (если используется)

### 2. Запуск приложения

```bash
docker compose up -d
```

Будут запущены все сервисы:
| Сервис | Описание | Порт |
|--------|----------|------|
| `gateway` | Nginx reverse proxy | **80** |
| `frontend` | React SPA | 3000 (внутренний) |
| `backend` | FastAPI API | 8000 (внутренний) |
| `worker` | Celery воркеры (×2) | — |
| `beat` | Celery планировщик | — |
| `flower-service` | Мониторинг Celery | 5555 (внутренний) |
| `db` | PostgreSQL | 5432 |
| `redis` | Redis (брокер) | 6379 |

### 3. Доступ к приложению

- **Приложение**: http://localhost
- **API**: http://localhost/api/v1
- **Swagger UI**: http://localhost/api/v1/docs

Учётные данные по умолчанию:
```
Логин: admin
Пароль: admin
```

### 4. Просмотр логов

```bash
# Все сервисы
docker compose logs -f

# Конкретный сервис
docker compose logs -f backend
docker compose logs -f worker
```

### 5. Остановка

```bash
docker compose down
```

Для полной очистки (включая volumes):
```bash
docker compose down -v
```

---

## 🛠 Разработка (без Docker)

### Бэкенд

```bash
cd backend

# Создание окружения
uv venv && source .venv/bin/activate

# Установка зависимостей
uv pip sync

# Настройка
cp .env.test .env  # Отредактируйте DATABASE_URL

# Миграции
.venv/bin/alembic upgrade head

# Запуск
.venv/bin/python main.py
```

Сервер: http://localhost:8000

### Фронтенд

```bash
cd frontend
npm install
npm run dev
```

Приложение: http://localhost:5173

### Celery Worker

```bash
cd celery_worker
# Требует запущенный Redis
celery -A celery_app worker --loglevel=info -E
```

### Celery Beat

```bash
cd celery_beat
# Требует запущенный Redis и PostgreSQL
celery -A celery_app beat --loglevel=info
```

---

## 🧪 Тестирование

### Бэкенд

```bash
cd backend
.venv/bin/pytest                    # Все тесты
.venv/bin/pytest --cov=app          # С покрытием
```

### Фронтенд

```bash
cd frontend
npm run test
```

---

## 📦 Технологии

### Бэкенд
- Python 3.12, FastAPI, SQLAlchemy 2.0, Alembic
- PostgreSQL, Redis, Celery
- JWT, LDAP/AD интеграция

### Фронтенд
- React 18, TypeScript, Vite
- TanStack Query, Zustand, MUI
- i18next, React Hook Form

---

## 📁 Структура проекта

```
infraportal/
├── backend/           # FastAPI приложение
├── frontend/          # React SPA
├── celery_worker/     # Celery воркеры
├── celery_beat/       # Celery планировщик
├── gateway/           # Nginx конфигурация
├── docs/              # Документация
├── docker-compose.yml
└── .env.example       # Шаблон переменных окружения
```

---

## 🗃️ Миграции БД

```bash
cd backend

# Создать миграцию
.venv/bin/alembic revision --autogenerate -m "Описание изменений"

# Применить миграции
.venv/bin/alembic upgrade head

# Откатить последнюю
.venv/bin/alembic downgrade -1
```

> При запуске через Docker миграции применяются автоматически.
