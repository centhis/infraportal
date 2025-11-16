import importlib
from pathlib import Path
from sqlalchemy.orm import declarative_base

Base = declarative_base()

def load_all_models():
    """
    Dynamically loads all models from the 'app' directory to ensure they are
    registered with SQLAlchemy's metadata.
    """
    app_dir = Path(__file__).parent.parent
    for models_file in app_dir.rglob("models.py"):
        # Construct the module path from the file path
        # e.g., /path/to/app/users/models.py -> app.users.models
        module_path = ".".join(models_file.with_suffix("").parts[len(app_dir.parent.parts):])
        importlib.import_module(module_path)
