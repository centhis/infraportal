from unittest.mock import MagicMock, patch

import pytest
from pydantic import BaseModel

from app.tasks import registry
from app.tasks.registry import TASK_REGISTRY, TaskDefinition, autodiscover_tasks


class MockSchema(BaseModel):
    param1: str


def test_autodiscover_tasks_registers_tasks():
    """
    Test that autodiscover_tasks correctly finds and resgisters tasks.
    We mock pkgutil.walk_packages and importlib.import_module to simulate finding a module.
    """
    # Clean registry before test
    TASK_REGISTRY.clear()

    # Setup mocks
    mock_module_name = "app.mock_module.tasks"

    # Mock the module that contains the task definitions
    # It must be a MagicMock that acts like a module
    mock_module = MagicMock()
    # It must have the TASK_DEFINITIONS attribute as a list
    mock_module.TASK_DEFINITIONS = [("mock_task", MockSchema, "mock:permission")]

    import pkgutil

    with patch("app.tasks.registry.importlib.import_module") as mock_import:
        with patch.object(pkgutil, "walk_packages") as mock_walk:
            # Setup walk_packages return values
            # The list contains tuples of (importer, module_name, is_pkg)
            mock_walk.return_value = [(None, mock_module_name, False)]

            # Setup import_module side effect to return our specific mock module
            def import_side_effect(name):
                if name == mock_module_name:
                    return mock_module
                # For "app" or others, return a generic mock
                m = MagicMock()
                m.__path__ = ["/mock/path"]
                m.__name__ = name
                return m

            mock_import.side_effect = import_side_effect

            # Run SUT
            autodiscover_tasks("app")

            # Verify walk called
            mock_walk.assert_called()

            # Verify registry population (Functional Validation)
            assert "mock_task" in TASK_REGISTRY
            task_def = TASK_REGISTRY["mock_task"]
            assert task_def.name == "mock_task"
            assert task_def.params_schema == MockSchema


def test_manual_registration_duplicate_error():
    """
    Test that registering a duplicate task raises ValueError.
    """
    TASK_REGISTRY.clear()
    TASK_REGISTRY["duplicate"] = TaskDefinition("duplicate", MockSchema, None)

    with pytest.raises(ValueError, match="Task with name 'duplicate' is already registered"):
        registry.register_task("duplicate", MockSchema, None)
