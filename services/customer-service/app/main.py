from contextlib import asynccontextmanager

from fastapi import FastAPI

from common.app import init_common
from common.config import get_base_settings
from common.db import Base

from .database import engine
from .routers import customers, services

settings = get_base_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(engine)
    yield


app = FastAPI(title="Customer Service", version="1.0.0", lifespan=lifespan)
init_common(app, service_name="customer-service", log_level=settings.log_level)
app.include_router(customers.router)
app.include_router(services.router)
