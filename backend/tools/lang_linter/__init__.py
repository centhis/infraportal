"""
Lang Linter - Линтер для проверки языковых требований и архитектурных правил.

Использование:
    python -m tools.lang_linter app/           # Все проверки
    python -m tools.lang_linter.checker app/   # Только языковые требования
    python -m tools.lang_linter.import_checker app/  # Только импорты
"""

from .checker import LintError, lint_directory, lint_file
from .checker import main as lang_main
from .import_checker import ImportViolation, check_directory, check_file
from .import_checker import main as import_main

__all__ = [
    "lint_file",
    "lint_directory",
    "lang_main",
    "LintError",
    "check_file",
    "check_directory",
    "import_main",
    "ImportViolation",
]
