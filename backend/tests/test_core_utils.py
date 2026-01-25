
import pytest
from datetime import timedelta
from unittest.mock import MagicMock, patch
from app.core.jwt_provider import JwtProvider
from app.core.permissions_registry import autodiscover_permissions, DISCOVERED_PERMISSIONS
from app.core.initial_data_loader import load_initial_data

def test_jwt_provider():
    provider = JwtProvider(secret_key="test_secret", algorythm="HS256")
    data = {"sub": "testuser", "id": 1}
    expires = timedelta(minutes=10)
    
    token = provider.create_token(data, expires, "access")
    assert isinstance(token, str)
    
    decoded = provider.decode_token(token)
    assert decoded["sub"] == "testuser"
    assert decoded["id"] == 1
    assert decoded["type"] == "access"

def test_jwt_provider_invalid_token():
    provider = JwtProvider(secret_key="test_secret", algorythm="HS256")
    with pytest.raises(Exception):
        provider.decode_token("invalid.token.here")

def test_autodiscover_permissions():
    mock_module = MagicMock()
    mock_module.module_permissions = [{"name": "test:perm", "description": "test"}]
    
    with patch("pkgutil.walk_packages") as mock_walk, \
         patch("importlib.import_module") as mock_import:
        
        # Setup walk_packages to return one module
        mock_walk.return_value = [(None, "app.test_mod.permissions", False)]
        
        # Setup import_module to return the package for walk_packages and then our mock module
        def side_effect(name):
            if name == "app":
                pkg = MagicMock()
                pkg.__path__ = ["/fake/path"]
                pkg.__name__ = "app"
                return pkg
            if name == "app.test_mod.permissions":
                return mock_module
            return MagicMock()
            
        mock_import.side_effect = side_effect
        
        autodiscover_permissions("app")
        
        assert len(DISCOVERED_PERMISSIONS) == 1
        assert DISCOVERED_PERMISSIONS[0]["name"] == "test:perm"

def test_load_initial_data():
    mock_db = MagicMock()
    mock_init_module = MagicMock()
    
    with patch("pathlib.Path.rglob") as mock_rglob, \
         patch("importlib.import_module") as mock_import:
        
        # Mock finding one initial_data.py
        mock_file = MagicMock()
        mock_file.with_suffix.return_value.parts = ("fake", "app", "test_mod", "initial_data")
        mock_rglob.return_value = [mock_file]
        
        mock_import.return_value = mock_init_module
        
        load_initial_data(mock_db)
        
        mock_init_module.init_data.assert_called_once_with(mock_db)
