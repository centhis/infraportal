
import inspect
import os
import sys

from fastapi import params
from fastapi.routing import APIRoute
from fastapi.security import OAuth2PasswordBearer

# Добавляем backend в путь импорта
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from main import app


def get_permissions_from_dependency(dependency):
    """
    Анализирует зависимость для поиска требуемых прав.
    """
    # Проверяем, является ли зависимость замыканием permission_checker
    # Мы ищем ячейки замыкания, которые содержат список строк (права)
    if hasattr(dependency, "__closure__") and dependency.__closure__:
        for cell in dependency.__closure__:
            if isinstance(cell.cell_contents, list):
                # Эвристика: если это список строк вида "resource:action"
                vals = cell.cell_contents
                if vals and all(isinstance(v, str) and ":" in v for v in vals):
                    return vals
    return []

def get_module_name(path: str) -> str:
    """Извлекает имя модуля из пути."""
    parts = path.strip("/").split("/")
    # Ожидаемый формат: api/v1/{module}/...
    if path.startswith("/api/v1/") and len(parts) >= 3:
        return parts[2].capitalize()
    return "Other"

def analyze_endpoints():
    internal_routes = []
    public_routes: dict[str, list[dict]] = {}

    total_endpoints = 0

    # Перебор всех маршрутов
    for route in app.routes:
        if isinstance(route, APIRoute):
            total_endpoints += 1
            method = list(route.methods)[0] # Обычно один метод на APIRoute
            path = route.path
            description = route.description or ""

            # Помощник для извлечения краткого описания (первая строка)
            summary = description.split("\n")[0] if description else ""

            permissions = []
            requires_auth = False
            is_internal = False

            # 1. Проверка прямых зависимостей маршрута (уровень роутера + уровень приложения + уровень декоратора)
            all_dependencies = route.dependencies

            for dep in all_dependencies:
                 # dep обычно является экземпляром params.Depends
                if isinstance(dep, params.Depends):
                    func = dep.dependency
                    if func:
                         # Прямая проверка прав
                         perms = get_permissions_from_dependency(func)
                         if perms:
                             permissions.extend(perms)

                         # Проверка на общую аутентификацию
                         if getattr(func, "__name__", "") == "get_current_user":
                             requires_auth = True

                         if getattr(func, "__name__", "") == "get_worker_api_key":
                             is_internal = True

                # Проверка зависимостей Security/OAuth2 напрямую в списке зависимостей
                if isinstance(dep, OAuth2PasswordBearer):
                    requires_auth = True

            # 2. Проверка аргументов функции маршрута на наличие Depends
            # Это обрабатывает: def foo(user = Depends(get_current_user))
            signature = inspect.signature(route.endpoint)
            for param in signature.parameters.values():
                val = param.default
                if isinstance(val, params.Depends):
                    func = val.dependency
                    if func:
                         if getattr(func, "__name__", "") == "get_current_user":
                             requires_auth = True

                         perms = get_permissions_from_dependency(func)
                         if perms:
                             permissions.extend(perms)

                # Проверка напрямую на OAuth2PasswordBearer (часто используется в Depends(oauth2_scheme))
                # Depends(oauth2_scheme) -> param.default это Depends, instance.dependency это экземпляр OAuth2PasswordBearer
                if isinstance(val, params.Depends):
                     if isinstance(val.dependency, OAuth2PasswordBearer):
                         requires_auth = True

            # 3. Специальная проверка внутренних API ключей из all_dependencies снова (так как они используют Security())
            # Security() также возвращает params.Security, который наследуется от params.Depends

            for dep in all_dependencies:
                if isinstance(dep, params.Security): # или params.Depends
                     func = dep.dependency
                     if getattr(func, "__name__", "") == "get_worker_api_key":
                         is_internal = True

            # Также проверяем аргументы функции на наличие Security(get_worker_api_key)
            for param in signature.parameters.values():
                val = param.default
                if isinstance(val, params.Security):
                    func = val.dependency
                    if getattr(func, "__name__", "") == "get_worker_api_key":
                        is_internal = True

            # Форматирование строки прав
            perm_str = ""
            if permissions:
                 # Удаление дубликатов и сортировка
                 unique_perms = sorted(set(permissions))
                 perm_str = ", ".join(unique_perms)
            elif is_internal:
                 perm_str = "Internal (API Key)"
            elif requires_auth:
                 perm_str = "Authenticated"
            else:
                 # Проверка на публичность
                 if "/auth/login" in path or "/docs" in path or "/openapi.json" in path:
                     perm_str = "Public"
                 else:
                     perm_str = "Public / Custom Auth"

            route_data = {
                "method": method,
                "path": path,
                "permissions": perm_str,
                "description": summary
            }

            # Категоризация
            if path.startswith("/api/internal"):
                internal_routes.append(route_data)
            else:
                module = get_module_name(path)
                if module not in public_routes:
                    public_routes[module] = []
                public_routes[module].append(route_data)

    # Сортировка внутренних маршрутов
    internal_routes.sort(key=lambda x: x["path"])

    # Сортировка модулей и их маршрутов
    sorted_modules = sorted(public_routes.keys())
    for mod in sorted_modules:
        public_routes[mod].sort(key=lambda x: x["path"])

    # Генерация Markdown отчета
    report_lines = []
    report_lines.append("# API Endpoint Permissions Report")
    report_lines.append("")
    report_lines.append(f"**Total Endpoints:** {total_endpoints}")
    report_lines.append("")

    # Внутренняя секция
    if internal_routes:
        report_lines.append("## Internal API")
        report_lines.append("These endpoints are restricted to internal services and workers via API Key.")
        report_lines.append("")
        report_lines.append("| Method | Path | Permissions | Description |")
        report_lines.append("|---|---|---|---|")
        for r in internal_routes:
             report_lines.append(f"| {r['method']} | `{r['path']}` | {r['permissions']} | {r['description']} |")
        report_lines.append("")

    # Публичная секция
    report_lines.append("## Public API")
    report_lines.append("Endpoints exposed to frontend/users.")
    report_lines.append("")

    for mod in sorted_modules:
        report_lines.append(f"### {mod}")
        report_lines.append("| Method | Path | Permissions | Description |")
        report_lines.append("|---|---|---|---|")
        for r in public_routes[mod]:
            report_lines.append(f"| {r['method']} | `{r['path']}` | {r['permissions']} | {r['description']} |")
        report_lines.append("")

    report_content = "\n".join(report_lines)

    # Запись в файл
    output_path = os.path.join(os.path.dirname(__file__), "..", "endpoint_permissions.md")
    with open(output_path, "w") as f:
        f.write(report_content)

    print(f"Report generated at: {output_path}")
    # print(report_content) # Слишком длинный для вывода

if __name__ == "__main__":
    analyze_endpoints()
