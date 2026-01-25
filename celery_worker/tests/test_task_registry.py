import pytest
from task_registry import register_task_handler, get_task_handler, autodiscover_handlers
from pathlib import Path

def test_register_and_get_handler():
    def my_handler():
        return "ok"
    
    register_task_handler("test_type", my_handler)
    assert get_task_handler("test_type") == my_handler

def test_get_handler_not_found():
    with pytest.raises(ValueError, match="Handler for task_type 'unknown' not found"):
        get_task_handler("unknown")

def test_autodiscover_handlers(tmp_path):
    # Create a dummy handler file
    handler_dir = tmp_path / "handlers"
    handler_dir.mkdir()
    
    handler_file = handler_dir / "my_mock_handler.py"
    handler_file.write_text("""
from task_registry import register_task_handler
def mock_h(): pass
register_task_handler("mock_task", mock_h)
""")

    # Note: autodiscover_handlers uses importlib, so it might be tricky with tmp_path 
    # if it's not in sys.path. But since it's a unit test for logic, 
    # we can check if it calls import_module correctly.
    
    # Let's test with the real 'handlers' directory to ensure it works in our structure
    real_handlers_path = Path(__file__).parent.parent / "handlers"
    autodiscover_handlers(real_handlers_path)
    
    # 'test_task' is registered in handlers/test_handler.py
    assert get_task_handler("test_task") is not None
