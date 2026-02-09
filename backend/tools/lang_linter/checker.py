"""
Линтер для проверки языковых требований в Python-коде.

Правила:
- Комментарии должны быть на русском
- Docstrings должны быть на русском
- Сообщения об ошибках (raise, HTTPException) должны быть на английском
- Логи (logger.*) должны быть на английском

Использование:
    python -m tools.lang_linter.checker app/
    python -m tools.lang_linter.checker --fix app/  # (будущее)
"""

import ast
import re
import sys
from collections.abc import Generator
from dataclasses import dataclass
from pathlib import Path

# Регулярка для кириллицы
CYRILLIC_REGEX = re.compile(r"[\u0400-\u04FF]")

# Регулярка для латиницы (слова от 2 букв)
LATIN_WORD_REGEX = re.compile(r"[a-zA-Z]{2,}")

# Паттерны исключений для комментариев
COMMENT_EXCLUSIONS = [
    re.compile(r"^#\s*type:", re.IGNORECASE),  # Подсказки типов
    re.compile(r"^#\s*noqa", re.IGNORECASE),  # Игнорирование линтера
    re.compile(r"^#\s*pragma", re.IGNORECASE),  # Pragma
    re.compile(r"^#\s*TODO", re.IGNORECASE),  # TODO (допускается)
    re.compile(r"^#\s*FIXME", re.IGNORECASE),  # FIXME (допускается)
    re.compile(r"^#\s*XXX", re.IGNORECASE),  # XXX (допускается)
    re.compile(r"^#\s*-\*-"),  # Объявление кодировки
    re.compile(r"^#!/"),  # Shebang (путь к интерпретатору)
]


@dataclass
class LintError:
    """Ошибка линтера."""

    file: Path
    line: int
    col: int
    rule: str
    message: str

    def __str__(self) -> str:
        return f"{self.file}:{self.line}:{self.col}: [{self.rule}] {self.message}"


class LanguageLinter(ast.NodeVisitor):
    """AST-визитор для проверки языковых требований."""

    def __init__(self, filepath: Path, source: str):
        self.filepath = filepath
        self.source = source
        self.lines = source.splitlines()
        self.errors: list[LintError] = []

    def add_error(self, line: int, col: int, rule: str, message: str) -> None:
        """Добавляет ошибку в список."""
        self.errors.append(
            LintError(file=self.filepath, line=line, col=col, rule=rule, message=message)
        )

    def check_comments(self) -> None:
        """Проверяет, что комментарии на русском языке."""
        for i, line in enumerate(self.lines, start=1):
            # Ищем комментарий
            if "#" not in line:
                continue

            # Находим позицию комментария (не в строке)
            comment_pos = self._find_comment_position(line)
            if comment_pos == -1:
                continue

            comment = line[comment_pos:].strip()

            # Проверяем исключения
            if self._is_excluded_comment(comment):
                continue

            # Извлекаем текст комментария
            text = comment[1:].strip()  # Убираем #

            # Пропускаем пустые или без слов
            if not text or len(re.sub(r"[^a-zA-Zа-яА-ЯёЁ]", "", text)) < 2:
                continue

            # Если есть латиница и НЕТ кириллицы — нарушение
            if LATIN_WORD_REGEX.search(text) and not CYRILLIC_REGEX.search(text):
                self.add_error(
                    line=i,
                    col=comment_pos + 1,
                    rule="comments-in-russian",
                    message=f'Комментарий должен быть на русском: "{self._truncate(text)}"',
                )

    def _find_comment_position(self, line: str) -> int:
        """Находит позицию комментария, игнорируя # в строках."""
        in_string = None
        escape = False

        for i, char in enumerate(line):
            if escape:
                escape = False
                continue
            if char == "\\":
                escape = True
                continue
            if char in ('"', "'"):
                if in_string is None:
                    # Проверяем тройные кавычки
                    if line[i : i + 3] in ('"""', "'''"):
                        in_string = line[i : i + 3]
                    else:
                        in_string = char
                elif in_string == char or (len(in_string) == 3 and line[i : i + 3] == in_string):
                    in_string = None
            elif char == "#" and in_string is None:
                return i
        return -1

    def _is_excluded_comment(self, comment: str) -> bool:
        """Проверяет, является ли комментарий исключением."""
        return any(pattern.match(comment) for pattern in COMMENT_EXCLUSIONS)

    def visit_FunctionDef(self, node: ast.FunctionDef) -> None:
        """Проверяет docstring функции."""
        self._check_docstring(node)
        self.generic_visit(node)

    def visit_AsyncFunctionDef(self, node: ast.AsyncFunctionDef) -> None:
        """Проверяет docstring async функции."""
        self._check_docstring(node)
        self.generic_visit(node)

    def visit_ClassDef(self, node: ast.ClassDef) -> None:
        """Проверяет docstring класса."""
        self._check_docstring(node)
        self.generic_visit(node)

    def visit_Module(self, node: ast.Module) -> None:
        """Проверяет docstring модуля."""
        self._check_docstring(node)
        self.generic_visit(node)

    def _check_docstring(self, node: ast.AST) -> None:
        """Проверяет, что docstring на русском."""
        docstring = ast.get_docstring(node)
        if not docstring:
            return

        # Получаем первую значимую строку docstring
        first_line = docstring.split("\n")[0].strip()

        # Если есть латиница и НЕТ кириллицы — нарушение
        if LATIN_WORD_REGEX.search(first_line) and not CYRILLIC_REGEX.search(first_line):
            # Получаем номер строки
            if hasattr(node, "body") and node.body:
                first_stmt = node.body[0] if isinstance(node.body, list) else node.body
                if isinstance(first_stmt, ast.Expr) and isinstance(first_stmt.value, ast.Constant):
                    line = first_stmt.lineno
                else:
                    line = getattr(node, "lineno", 1)
            else:
                line = getattr(node, "lineno", 1)

            self.add_error(
                line=line,
                col=1,
                rule="docstring-in-russian",
                message=f'Docstring должен быть на русском: "{self._truncate(first_line)}"',
            )

    def visit_Raise(self, node: ast.Raise) -> None:
        """Проверяет сообщения в raise."""
        if node.exc is None:
            self.generic_visit(node)
            return

        # Ищем строковые аргументы в исключении
        messages = self._extract_error_messages(node.exc)
        for msg, msg_node in messages:
            if CYRILLIC_REGEX.search(msg):
                self.add_error(
                    line=msg_node.lineno,
                    col=msg_node.col_offset + 1,
                    rule="errors-in-english",
                    message=f'Сообщение об ошибке должно быть на английском: "{self._truncate(msg)}"',
                )

        self.generic_visit(node)

    def visit_Call(self, node: ast.Call) -> None:
        """Проверяет HTTPException и logger вызовы."""
        # Проверяем HTTPException
        if self._is_http_exception(node):
            self._check_http_exception(node)

        # Проверяем logger
        if self._is_logger_call(node):
            self._check_logger_call(node)

        self.generic_visit(node)

    def _is_http_exception(self, node: ast.Call) -> bool:
        """Проверяет, является ли вызов HTTPException."""
        if isinstance(node.func, ast.Name):
            return node.func.id == "HTTPException"
        if isinstance(node.func, ast.Attribute):
            return node.func.attr == "HTTPException"
        return False

    def _check_http_exception(self, node: ast.Call) -> None:
        """Проверяет detail в HTTPException."""
        for keyword in node.keywords:
            if keyword.arg == "detail":
                msg = self._extract_string_value(keyword.value)
                if msg and CYRILLIC_REGEX.search(msg):
                    self.add_error(
                        line=keyword.value.lineno,
                        col=keyword.value.col_offset + 1,
                        rule="errors-in-english",
                        message=f'HTTPException.detail должен быть на английском: "{self._truncate(msg)}"',
                    )

    def _is_logger_call(self, node: ast.Call) -> bool:
        """Проверяет, является ли вызов методом логгера."""
        if not isinstance(node.func, ast.Attribute):
            return False

        log_methods = ("debug", "info", "warning", "warn", "error", "critical", "exception")
        if node.func.attr not in log_methods:
            return False

        # Проверяем, что объект называется logger или logging
        if isinstance(node.func.value, ast.Name):
            return node.func.value.id in ("logger", "logging", "log")
        if isinstance(node.func.value, ast.Attribute):
            return node.func.value.attr == "logger"

        return False

    def _check_logger_call(self, node: ast.Call) -> None:
        """Проверяет сообщения в logger вызовах."""
        if not node.args:
            return

        # Первый аргумент — сообщение
        msg = self._extract_string_value(node.args[0])
        if msg and CYRILLIC_REGEX.search(msg):
            method = node.func.attr if isinstance(node.func, ast.Attribute) else "log"
            self.add_error(
                line=node.args[0].lineno,
                col=node.args[0].col_offset + 1,
                rule="logs-in-english",
                message=f'Лог ({method}) должен быть на английском: "{self._truncate(msg)}"',
            )

    def _extract_error_messages(self, node: ast.AST) -> list[tuple[str, ast.AST]]:
        """Извлекает строковые сообщения из исключения."""
        messages = []

        if isinstance(node, ast.Call):
            # Exception("message") или Exception(message="...")
            for arg in node.args:
                msg = self._extract_string_value(arg)
                if msg:
                    messages.append((msg, arg))
            for kw in node.keywords:
                if kw.arg in ("msg", "message", "detail"):
                    msg = self._extract_string_value(kw.value)
                    if msg:
                        messages.append((msg, kw.value))

        return messages

    def _extract_string_value(self, node: ast.AST) -> str | None:
        """Извлекает строковое значение из узла AST."""
        if isinstance(node, ast.Constant) and isinstance(node.value, str):
            return node.value
        if isinstance(node, ast.JoinedStr):
            # f-string: собираем только константные части
            parts = []
            for value in node.values:
                if isinstance(value, ast.Constant) and isinstance(value.value, str):
                    parts.append(value.value)
            return "".join(parts) if parts else None
        return None

    def _truncate(self, text: str, max_len: int = 50) -> str:
        """Обрезает текст до максимальной длины."""
        if len(text) > max_len:
            return text[:max_len] + "..."
        return text


def lint_file(filepath: Path) -> list[LintError]:
    """Проверяет один файл."""
    try:
        source = filepath.read_text(encoding="utf-8")
    except Exception as e:
        return [LintError(filepath, 1, 1, "read-error", str(e))]

    try:
        tree = ast.parse(source, filename=str(filepath))
    except SyntaxError as e:
        return [LintError(filepath, e.lineno or 1, e.offset or 1, "syntax-error", str(e))]

    linter = LanguageLinter(filepath, source)
    linter.check_comments()
    linter.visit(tree)

    return linter.errors


def lint_directory(
    directory: Path, exclude: list[str] | None = None
) -> Generator[LintError, None, None]:
    """Проверяет все Python-файлы в директории."""
    exclude = exclude or ["__pycache__", ".venv", "venv", "migrations", "alembic"]

    for filepath in directory.rglob("*.py"):
        # Пропускаем исключённые директории
        if any(excl in filepath.parts for excl in exclude):
            continue

        yield from lint_file(filepath)


def main() -> int:
    """Точка входа."""
    import argparse

    parser = argparse.ArgumentParser(description="Проверка языковых требований в Python-коде")
    parser.add_argument("paths", nargs="+", type=Path, help="Файлы или директории для проверки")
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

    error_count = 0

    for path in args.paths:
        if path.is_file():
            errors = lint_file(path)
        elif path.is_dir():
            errors = list(lint_directory(path, args.exclude))
        else:
            print(f"Warning: {path} not found", file=sys.stderr)
            continue

        for error in errors:
            error_count += 1
            if not args.quiet:
                print(error)

    if args.quiet and error_count > 0:
        print(f"Found {error_count} language rule violations")
    elif error_count == 0:
        print("✓ No language rule violations found")

    return 1 if error_count > 0 else 0


if __name__ == "__main__":
    sys.exit(main())
