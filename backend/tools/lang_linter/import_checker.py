"""
Линтер для проверки кросс-доменных импортов.

Правило: Бизнес-домены (users, settings, tasks, etc.) не должны импортировать
друг друга напрямую. Все межмодульные зависимости должны проходить через core/.

Разрешённые импорты:
- core/* — можно импортировать откуда угодно
- db/* — можно импортировать откуда угодно
- auth/* — системный модуль, можно импортировать откуда угодно

Использование:
    python -m tools.lang_linter.import_checker app/
"""

import ast
import sys
from collections.abc import Generator
from dataclasses import dataclass
from pathlib import Path

# Системные модули, которые можно импортировать откуда угодно
SYSTEM_MODULES = {"core", "db", "auth"}

# Бизнес-домены, между которыми запрещены прямые импорты
BUSINESS_DOMAINS = {"users", "settings", "tasks"}


@dataclass
class ImportViolation:
    """Нарушение правил импорта."""

    file: Path
    line: int
    source_domain: str
    target_domain: str
    import_statement: str

    def __str__(self) -> str:
        return (
            f"{self.file}:{self.line}: [cross-domain-import] "
            f"Запрещён импорт из '{self.target_domain}/' в модуле '{self.source_domain}/': "
            f"{self.import_statement}"
        )


class ImportChecker(ast.NodeVisitor):
    """AST-визитор для проверки кросс-доменных импортов."""

    def __init__(self, filepath: Path, source_domain: str):
        self.filepath = filepath
        self.source_domain = source_domain
        self.violations: list[ImportViolation] = []

    def _check_import(self, module: str, line: int, statement: str) -> None:
        """Проверяет, нарушает ли импорт правила."""
        if not module:
            return

        # Парсим модуль app.xxx.yyy
        parts = module.split(".")

        # Проверяем только импорты из app.*
        if len(parts) < 2 or parts[0] != "app":
            return

        target_domain = parts[1]

        # Системные модули можно импортировать откуда угодно
        if target_domain in SYSTEM_MODULES:
            return

        # Если source и target — разные бизнес-домены, это нарушение
        if (
            self.source_domain in BUSINESS_DOMAINS
            and target_domain in BUSINESS_DOMAINS
            and self.source_domain != target_domain
        ):
            self.violations.append(
                ImportViolation(
                    file=self.filepath,
                    line=line,
                    source_domain=self.source_domain,
                    target_domain=target_domain,
                    import_statement=statement,
                )
            )

    def visit_Import(self, node: ast.Import) -> None:
        """Обрабатывает import statements."""
        for alias in node.names:
            self._check_import(alias.name, node.lineno, f"import {alias.name}")
        self.generic_visit(node)

    def visit_ImportFrom(self, node: ast.ImportFrom) -> None:
        """Обрабатывает from ... import statements."""
        if node.module:
            # Формируем читаемое представление импорта
            names = ", ".join(alias.name for alias in node.names[:3])
            if len(node.names) > 3:
                names += ", ..."
            statement = f"from {node.module} import {names}"

            self._check_import(node.module, node.lineno, statement)

        self.generic_visit(node)


def get_domain_from_path(filepath: Path) -> str | None:
    """Определяет домен по пути к файлу."""
    parts = filepath.parts

    # Ищем 'app' в пути
    try:
        app_idx = parts.index("app")
        if app_idx + 1 < len(parts):
            return parts[app_idx + 1]
    except ValueError:
        pass

    return None


def check_file(filepath: Path) -> list[ImportViolation]:
    """Проверяет один файл на нарушения импортов."""
    source_domain = get_domain_from_path(filepath)

    if not source_domain:
        return []

    # Проверяем только бизнес-домены
    if source_domain not in BUSINESS_DOMAINS:
        return []

    try:
        source = filepath.read_text(encoding="utf-8")
    except Exception:
        return []

    try:
        tree = ast.parse(source, filename=str(filepath))
    except SyntaxError:
        return []

    checker = ImportChecker(filepath, source_domain)
    checker.visit(tree)

    return checker.violations


def check_directory(
    directory: Path, exclude: list[str] | None = None
) -> Generator[ImportViolation, None, None]:
    """Проверяет все Python-файлы в директории."""
    exclude = exclude or ["__pycache__", ".venv", "venv", "migrations", "alembic", "tests"]

    for filepath in directory.rglob("*.py"):
        # Пропускаем исключённые директории
        if any(excl in filepath.parts for excl in exclude):
            continue

        yield from check_file(filepath)


def main() -> int:
    """Точка входа."""
    import argparse

    parser = argparse.ArgumentParser(description="Проверка кросс-доменных импортов в Python-коде")
    parser.add_argument("paths", nargs="+", type=Path, help="Файлы или директории для проверки")
    parser.add_argument(
        "--exclude",
        nargs="*",
        default=["__pycache__", ".venv", "venv", "migrations", "alembic", "tests"],
        help="Директории для исключения",
    )
    parser.add_argument(
        "--quiet", "-q", action="store_true", help="Показывать только количество нарушений"
    )
    parser.add_argument("--domains", nargs="*", help="Дополнительные бизнес-домены для проверки")

    args = parser.parse_args()

    # Добавляем дополнительные домены, если указаны
    if args.domains:
        BUSINESS_DOMAINS.update(args.domains)

    violation_count = 0

    for path in args.paths:
        if path.is_file():
            violations = check_file(path)
        elif path.is_dir():
            violations = list(check_directory(path, args.exclude))
        else:
            print(f"Warning: {path} not found", file=sys.stderr)
            continue

        for violation in violations:
            violation_count += 1
            if not args.quiet:
                print(violation)

    if args.quiet and violation_count > 0:
        print(f"Found {violation_count} cross-domain import violations")
    elif violation_count == 0:
        print("✓ No cross-domain import violations found")

    return 1 if violation_count > 0 else 0


if __name__ == "__main__":
    sys.exit(main())
