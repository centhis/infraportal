
from unittest.mock import MagicMock
import pytest
from unittest.mock import AsyncMock, patch
import httpx

@pytest.mark.asyncio
async def test_get_celery_status_success(authenticated_client):
    
    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = MagicMock(spec=httpx.Response)
        mock_get.return_value.status_code = 200
        mock_get.return_value.json.return_value = {"worker1@host": {"status": "online"}}
        
        response = authenticated_client.get("/api/v1/metrics/celery/status")
        
        assert response.status_code == 200
        data = response.json()
        assert data["workers_count"] == 1
        assert "worker1@host" in data["workers"]

@pytest.mark.asyncio
async def test_get_celery_status_flower_error(authenticated_client):
    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = MagicMock(spec=httpx.Response)
        mock_get.return_value.status_code = 500
        
        response = authenticated_client.get("/api/v1/metrics/celery/status")
        assert response.status_code == 503
        assert "Flower API returned error" in response.json()["detail"]

@pytest.mark.asyncio
async def test_get_celery_status_connection_error(authenticated_client):
    with patch("httpx.AsyncClient.get", side_effect=httpx.RequestError("Connection refused")):
        response = authenticated_client.get("/api/v1/metrics/celery/status")
        assert response.status_code == 503
        assert "Could not connect to Flower service" in response.json()["detail"]

def test_get_celery_status_unauthorized(client):
    response = client.get("/api/v1/metrics/celery/status")
    assert response.status_code == 401


