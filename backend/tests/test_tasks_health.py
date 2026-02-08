import pytest
from unittest.mock import AsyncMock, patch
from fastapi import status
from httpx import Response, RequestError, Request

@pytest.mark.asyncio
async def test_get_workers_health_ok(authenticated_client):
    """
    Тест успешного получения статуса воркеров.
    Мокируем ответ от Flower (есть активные воркеры).
    """
    mock_response = {
        "celery@worker1": {"status": True},
        "celery@worker2": {"status": True}
    }
    
    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = Response(200, json=mock_response, request=Request("GET", "http://test"))
        
        response = authenticated_client.get("/api/v1/tasks/workers/health")
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["active_workers"] == 2
        assert data["status"] == "OK"

@pytest.mark.asyncio
async def test_get_workers_health_no_workers(authenticated_client):
    """
    Тест случая, когда Flower возвращает пустой список.
    """
    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = Response(200, json={}, request=Request("GET", "http://test"))
        
        response = authenticated_client.get("/api/v1/tasks/workers/health")
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["active_workers"] == 0
        assert data["status"] == "No active workers"

@pytest.mark.asyncio
async def test_get_workers_health_flower_down(authenticated_client):
    """
    Тест случая, когда Flower недоступен.
    """
    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        # Симулируем ошибку сети
        mock_get.side_effect = RequestError("Connection error", request=AsyncMock())
        
        response = authenticated_client.get("/api/v1/tasks/workers/health")
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["active_workers"] == 0
        assert data["status"] == "Monitoring Unavailable"
