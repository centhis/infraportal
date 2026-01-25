#!/bin/bash
# Этот скрипт предназначен для запуска из корня директории celery_beat.

# Активируем виртуальное окружение, находящееся в текущей директории.
# Оператор `.` является псевдонимом для `source`.
. .venv/bin/activate

# Удаляем предыдущий pid-файл, если он существует
rm -f /tmp/celerybeat.pid

echo "Запуск Celery Beat..."
# Запускаем celery beat. Имя приложения теперь 'celery_app', так как импорты были исправлены.
exec celery -A celery_app beat --loglevel=info --pidfile=/tmp/celerybeat.pid
