"""
Entry point для запуска линтера как модуля.

Использование:
    python -m tools.lang_linter app/              # Все проверки
    python -m tools.lang_linter --lang app/       # Только языковые
    python -m tools.lang_linter --imports app/    # Только импорты
"""

import argparse
import sys
from pathlib import Path

from .checker import lint_directory, lint_file
from .import_checker import check_directory, check_file


def main() -> int:
    """Запускает все проверки линтера."""
    parser = argparse.ArgumentParser(
        description="Проверка языковых и архитектурных требований в Python-коде"
    )
    parser.add_argument("paths", nargs="+", type=Path, help="Файлы или директории для проверки")
    parser.add_argument(
        "--lang",
        action="store_true",
        help="Только языковые требования (комментарии, docstrings, ошибки, логи)",
    )
    parser.add_argument(
        "--imports", action="store_true", help="Только проверка кросс-доменных импортов"
    )
    parser.add_argument(
        "--exclude",
        nargs="*",
        default=["__pycache__", ".venv", "venv", "migrations", "alembic"],
        help="Директории для исключения",
    )
    parser.add_argument(
        "--quiet", "-q", action="store_true", help="Показывать только количество ошибок"
    )

    args = parser.parse_args()

    # Если не указаны флаги — запускаем обе проверки
    run_lang = args.lang or (not args.lang and not args.imports)
    run_imports = args.imports or (not args.lang and not args.imports)

    lang_errors = 0
    import_errors = 0

    for path in args.paths:
        # Языковые проверки
        if run_lang:
            if path.is_file():
                errors = lint_file(path)
            elif path.is_dir():
                errors = list(lint_directory(path, args.exclude))
            else:
                continue

            for error in errors:
                lang_errors += 1
                if not args.quiet:
                    print(error)

        # Проверка импортов
        if run_imports:
            if path.is_file():
                violations = check_file(path)
            elif path.is_dir():
                violations = list(check_directory(path, args.exclude + ["tests"]))
            else:
                continue

            for violation in violations:
                import_errors += 1
                if not args.quiet:
                    print(violation)

    total_errors = lang_errors + import_errors

    if args.quiet:
        if total_errors > 0:
            parts = []
            if run_lang:
                parts.append(f"{lang_errors} language violations")
            if run_imports:
                parts.append(f"{import_errors} import violations")
            print(f"Found {', '.join(parts)}")
    elif total_errors == 0:
        print("✓ No violations found")
    else:
        print(f"\n{'=' * 50}")
        if run_lang:
            print(f"Language violations: {lang_errors}")
        if run_imports:
            print(f"Import violations: {import_errors}")
        print(f"Total: {total_errors}")

    return 1 if total_errors > 0 else 0


if __name__ == "__main__":
    sys.exit(main())
