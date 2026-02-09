from unittest.mock import MagicMock

from pydantic import BaseModel

from app.core import task_collector
from app.core.task_contract import TaskDefinition


class MockParams(BaseModel):
    id: int
    name: str


def test_task_definition_initialization():
    """Тест создания объекта TaskDefinition."""
    task = TaskDefinition(
        name="test:task",
        display_name="Test",
        category="test",
        permission="test:perm",
        params_schema=MockParams,
    )
    assert task.name == "test:task"
    assert task.params_schema == MockParams
    assert task.secrets == []


def test_task_collector_collect_all_tasks(monkeypatch):
    """Тест автоматического сбора задач коллектором."""
    # Очищаем кэш перед тестом
    task_collector._task_cache.clear()

    mock_module_name = "app.mock_pkg.tasks"
    mock_module = MagicMock()

    # Резолвим TaskDefinition из того же места, что и коллектор
    # чтобы isinstance работал корректно
    from app.core.task_contract import TaskDefinition as TD

    single_task = TD(name="test:single", display_name="Single", category="test", permission="none")
    mock_module.TASK = single_task
    mock_module.TASK_DEFINITIONS = []

    mock_module.TASK_DEFINITIONS = []

    mock_pkg = MagicMock()
    mock_pkg.__path__ = ["/fake/path"]
    mock_pkg.__name__ = "app"

    def mock_import(name):
        print(f"DEBUG: Importing {name}")
        if name == "app":
            return mock_pkg
        if name == mock_module_name:
            return mock_module
        return MagicMock()

    def mock_walk(path, prefix):
        print(f"DEBUG: Walking {path} with prefix {prefix}")
        return [(None, mock_module_name, False)]

    # Используем monkeypatch для системных модулей внутри task_collector
    monkeypatch.setattr(task_collector.importlib, "import_module", mock_import)
    monkeypatch.setattr(task_collector.pkgutil, "walk_packages", mock_walk)

    tasks = task_collector.collect_all_tasks()

    task_names = [t.name for t in tasks]
    print(f"DEBUG: Collected tasks: {task_names}")
    assert "test:single" in task_names


def test_task_collector_collect_list_definitions(monkeypatch):
    """Тест сбора списка задач из TASK_DEFINITIONS."""
    task_collector._task_cache.clear()
    from app.core.task_contract import TaskDefinition as TD

    mock_module_name = "app.mock_pkg.tasks"
    mock_module = MagicMock()
    t_list = [
        TD(name="t1", display_name="T1", category="c", permission="p"),
        TD(name="t2", display_name="T2", category="c", permission="p"),
    ]
    mock_module.TASK_DEFINITIONS = t_list
    mock_module.TASK = None

    def mock_import(name):
        if name == "app":
            m = MagicMock()
            m.__path__ = ["/fake/path"]
            m.__name__ = "app"
            return m
        if name == mock_module_name:
            return mock_module
        return MagicMock()

    def mock_walk(path, prefix):
        return [(None, mock_module_name, False)]

    monkeypatch.setattr(task_collector.importlib, "import_module", mock_import)
    monkeypatch.setattr(task_collector.pkgutil, "walk_packages", mock_walk)

    tasks = task_collector.collect_all_tasks()
    task_names = [t.name for t in tasks]
    assert "t1" in task_names
    assert "t2" in task_names
    assert len(tasks) == 2


def test_get_task_definition():
    """Тест получения конкретной задачи по имени."""
    task_collector._task_cache.clear()

    t1 = TaskDefinition(name="t1", display_name="T1", category="c", permission="p")
    task_collector._task_cache["t1"] = t1

    assert task_collector.get_task_definition("t1") == t1
    assert task_collector.get_task_definition("non_existent") is None
