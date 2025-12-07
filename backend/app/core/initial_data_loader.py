import importlib
from pathlib import Path
from sqlalchemy.orm import Session

def load_initial_data(db: Session):
    """
    Dynamically loads all initial_data modules from the 'app' directory.
    """
    app_dir = Path(__file__).parent.parent
    for initial_data_file in app_dir.rglob("initial_data.py"):
        # Construct the module path from the file path
        # e.g., /path/to/app/users/initial_data.py -> app.users.initial_data
        module_path = ".".join(initial_data_file.with_suffix("").parts[len(app_dir.parent.parts):])
        module = importlib.import_module(module_path)
        if hasattr(module, "init_data"):
            module.init_data(db)
