import importlib
from pathlib import Path

from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass


def load_all_models():
    """
    Динамически загружает все модели из директории 'app', чтобы убедиться,
    что они зарегистрированы в метаданных SQLAlchemy.
    """
    app_dir = Path(__file__).parent.parent
    for models_file in app_dir.rglob("models.py"):
        # Сконструировать путь к модулю из пути к файлу
        # например, /path/to/app/users/models.py -> app.users.models
        module_path = ".".join(models_file.with_suffix("").parts[len(app_dir.parent.parts) :])
        importlib.import_module(module_path)
