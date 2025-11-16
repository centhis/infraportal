import importlib
import pkgutil
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.db.database import SessionLocal
from app.core.initial_data_loader import load_initial_data

@asynccontextmanager
async def lifespan(app: FastAPI):
    db = SessionLocal()
    try:
        load_initial_data(db)
    finally:
        db.close()
    yield

app = FastAPI(
    title = "Infraportal backend",
    description="API for infraportal",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

package = "app.api.v1"
for _, module_name, _ in pkgutil.iter_modules([package.replace(".", "/")]):
    module = importlib.import_module(f"{package}.{module_name}")
    if hasattr(module, "router"):
        app.include_router(module.router, prefix=settings.API_PREFIX)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=9000, reload=True)
