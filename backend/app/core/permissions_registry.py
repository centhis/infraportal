import importlib
import pkgutil
import logging
from typing import List, Dict

logger = logging.getLogger(__name__)

# Глобальный список всех обнаруженных прав
DISCOVERED_PERMISSIONS: List[Dict[str, str]] = []

def autodiscover_permissions(package_name: str = "app"):
    """
    Сканирует пакеты и ищет в них файлы `permissions.py`.
    Ожидает, что в модуле определена переменная (list) с именем `module_permissions`.
    """
    global DISCOVERED_PERMISSIONS
    DISCOVERED_PERMISSIONS.clear()
    
    package = importlib.import_module(package_name)
    
    # Рекурсивно проходим по всем пакетам
    for _, module_name, is_pkg in pkgutil.walk_packages(package.__path__, package.__name__ + "."):
        if is_pkg:
            continue
            
        if module_name.endswith(".permissions"):
            try:
                module = importlib.import_module(module_name)
                if hasattr(module, "module_permissions"):
                    perms = getattr(module, "module_permissions")
                    if isinstance(perms, list):
                        DISCOVERED_PERMISSIONS.extend(perms)
                        logger.info(f"Loaded permissions from {module_name}: {len(perms)} found")
            except ImportError as e:
                logger.warning(f"Error importing {module_name}: {e}")
            except Exception as e:
                logger.error(f"Error loading permissions from {module_name}: {e}")

    logger.info(f"Total discovered permissions: {len(DISCOVERED_PERMISSIONS)}")
