import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from app.core.config import settings
from app.auth.dependencies import get_current_user

router = APIRouter(prefix="/metrics", tags=["Metrics"])

@router.get("/celery/status")
async def get_celery_status(
    current_user = Depends(get_current_user),
):
    """
    Proxies requests to Flower API to get Celery worker status.
    Returns aggregated metrics about workers and tasks.
    """
    flower_url = f"{settings.FLOWER_API_URL.rstrip('/')}/api/workers"
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(flower_url, timeout=5.0)
            
        if response.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Flower API returned error: {response.status_code}"
            )
            
        workers = response.json()
        
        # Transform data for UI if needed, or return as is
        # For now, we return the raw Flower response but you might want to simplify it
        return {
            "workers_count": len(workers),
            "workers": workers
        }
        
    except httpx.RequestError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Could not connect to Flower service: {str(e)}"
        )
