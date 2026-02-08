from unittest.mock import MagicMock, patch

from app.core.scheduler_patch import apply_patches


def test_apply_patches_success():
    # Mocking models and event to verify re-registration
    mock_models = MagicMock()
    mock_models.PeriodicTaskChanged.update_changed = MagicMock()

    # Setup some dummy targets
    mock_periodic_task = MagicMock()
    mock_periodic_task.__name__ = "PeriodicTask"

    with (
        patch("celery_sqlalchemy_scheduler.models", mock_models),
        patch("sqlalchemy.event.contains", return_value=True),
        patch("sqlalchemy.event.remove"),
        patch("sqlalchemy.event.listen") as mock_listen,
    ):
        # We need to simulate the targets list inside apply_patches
        # For simplicity, we just check if it calls event.listen
        apply_patches()

        assert mock_listen.called
        assert hasattr(mock_models.PeriodicTaskChanged, "update_changed")


def test_apply_patches_exception_handling():
    with patch(
        "celery_sqlalchemy_scheduler.models.PeriodicTaskChanged.update_changed",
        side_effect=Exception("error"),
    ):
        # Should not raise
        apply_patches()
