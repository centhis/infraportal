import importlib.util
import logging
import os

logger = logging.getLogger(__name__)

# Глобальный список всех обнаруженных прав
DISCOVERED_PERMISSIONS: list[dict[str, str]] = []


def autodiscover_permissions(app_path: str):
    """
    Сканирует директории доменов и ищет файлы `permissions.py`.
    Ожидает, что в файле определена переменная (list) с именем `module_permissions`.

    Явно загружает файлы permissions.py, обходя конфликт с одноимёнными пакетами.
    """
    global DISCOVERED_PERMISSIONS
    DISCOVERED_PERMISSIONS.clear()

    # Сканируем все поддиректории app/
    for domain_name in os.listdir(app_path):
        domain_path = os.path.join(app_path, domain_name)

        # Пропускаем файлы и служебные директории
        if not os.path.isdir(domain_path) or domain_name.startswith("_"):
            continue

        permissions_file = os.path.join(domain_path, "permissions.py")

        if not os.path.isfile(permissions_file):
            continue

        try:
            # Загружаем файл напрямую через spec
            module_name = f"app.{domain_name}.permissions"
            spec = importlib.util.spec_from_file_location(module_name, permissions_file)
            if spec is None or spec.loader is None:
                logger.warning(f"Cannot create spec for {permissions_file}")
                continue

            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)

            if hasattr(module, "module_permissions"):
                perms = module.module_permissions
                if isinstance(perms, list):
                    DISCOVERED_PERMISSIONS.extend(perms)
                    logger.info(f"Loaded permissions from {module_name}: {len(perms)} found")
        except Exception as e:
            logger.error(f"Error loading permissions from {permissions_file}: {e}")

    logger.info(f"Total discovered permissions: {len(DISCOVERED_PERMISSIONS)}")
