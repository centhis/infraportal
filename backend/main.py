import importlib
import pkgutil
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.db.database import SessionLocal
from app.core.initial_data_loader import load_initial_data
from app.tasks.registry import autodiscover_tasks, TASK_REGISTRY
from app.tasks.schedule_service import ScheduleService
from app.core.scheduling import scheduler
from app.settings.ldap.services import is_ldap_enabled, get_ldap_setting_value

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Application startup...")
    
    # Patch 3rd party libs if needed
    from app.core.scheduler_patch import apply_patches
    apply_patches()
    
    # 1. Autodiscover background tasks
    logger.info("Discovering background tasks...")
    autodiscover_tasks("app")
    
    # Register Core Scheduler Implementation (Dependency Injection)
    scheduler.set_implementation(ScheduleService)
    
    logger.info(f"Discovered tasks: {', '.join(TASK_REGISTRY.keys()) if TASK_REGISTRY else 'none'}")

    # 2. Load initial data
    db = SessionLocal()
    try:
        load_initial_data(db)
        
        # 3. Serialize Periodic Tasks with Settings using Proxy
        logger.info("Syncing periodic tasks with settings...")
        
        # LDAP Sync
        ldap_enabled = is_ldap_enabled(db)
        ldap_schedule = get_ldap_setting_value(db, "LDAP_SYNC_SCHEDULE") or "0 0 * * *"
        
        scheduler.create_or_update_periodic_task(
            db, # Proxy takes db as first arg
            task_name="Users: LDAP Sync",
            task_func="tasks.dispatch",
            cron_schedule=ldap_schedule,
            kwargs={
                "task_type": "users:sync_ldap",
                "ldap_uri": get_ldap_setting_value(db, "LDAP_URI"),
                "base_dn": get_ldap_setting_value(db, "LDAP_BASE_DN"),
                "bind_dn": get_ldap_setting_value(db, "LDAP_BIND_DN"),
                "user_filter": get_ldap_setting_value(db, "LDAP_USER_FILTER"),
                "attributes_mapping": {}
            },
            enabled=ldap_enabled
        )
    finally:
        db.close()
    
    logger.info("Application startup complete.")
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

# Auto-discover and include public API routers
# Auto-discover modular API routers
# Scans all submodules in 'app' (e.g., app.tasks, app.users)
# Checks for 'api' submodule (e.g., app.tasks.api)
# Includes 'router' to V1 API and 'internal_router' to Internal API
app_package = importlib.import_module("app")
if hasattr(app_package, "__path__"):
    for _, module_name, is_pkg in pkgutil.iter_modules(app_package.__path__):
        if is_pkg:
            try:
                # Try to import app.<module>.api
                api_module = importlib.import_module(f"app.{module_name}.api")
                
                # 1. Include Public V1 Router
                if hasattr(api_module, "router"):
                    app.include_router(api_module.router, prefix=settings.API_PREFIX)
                    logger.info(f"Included V1 router from app.{module_name}")

                # 2. Include Internal Router
                if hasattr(api_module, "internal_router"):
                    app.include_router(api_module.internal_router, prefix="/api/internal")
                    logger.info(f"Included Internal router from app.{module_name}")
                    
            except ImportError as e:
                logger.error(f"ImportError while loading API from app.{module_name}.api: {str(e)}")
                pass
            except Exception as e:
                logger.error(f"Unexpected error while loading API from app.{module_name}.api: {str(e)}")
                pass


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=9000, reload=True)
