#!/bin/bash
# celery_worker/start_worker.sh

# Активируем виртуальное окружение
source .venv/bin/activate

# Явно добавляем текущую директорию в PYTHONPATH, чтобы Celery мог найти модуль 'tasks'
export PYTHONPATH="."

echo "Starting Celery Worker..."
# Запускаем Celery, указывая на модуль celery_app (файл celery_app.py),
# который находится в текущей директории.
exec celery -A celery_app worker --loglevel=info -P prefork