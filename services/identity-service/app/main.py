from contextlib import asynccontextmanager

from fastapi import FastAPI

from common.app import init_common
from common.config import get_base_settings
from common.db import Base

from .database import SessionLocal, engine
from .routers import auth, users
from .seed import seed_defaults

settings = get_base_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        seed_defaults(db)
    yield


app = FastAPI(title="Identity Service", version="1.0.0", lifespan=lifespan)
init_common(app, service_name="identity-service", log_level=settings.log_level)
app.include_router(auth.router)
app.include_router(users.router)
