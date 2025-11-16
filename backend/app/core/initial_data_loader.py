import pkgutil
import importlib
from pathlib import Path
from sqlalchemy.orm import Session

def load_initial_data(db: Session):
    """
    Динамически обнаруживает и запускает все файлы 'initial_data.py' в директории 'app'.
    """
    app_dir = Path(__file__).parent.parent
    for _, module_name, _ in pkgutil.walk_packages(
        path=[str(app_dir)],
        prefix="app.",
        onerror=lambda x: None
    ):
        if "initial_data" in module_name:
            module = importlib.import_module(module_name)
            if hasattr(module, "init_data"):
                module.init_data(db)
