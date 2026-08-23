from contextlib import asynccontextmanager

from fastapi import FastAPI

from common.app import init_common
from common.config import get_base_settings
from common.db import Base
from common.outbox import start_outbox_relay

from .database import SessionLocal, engine
from .models import Outbox
from .producer import producer
from .routers import esign, tasks, workflows
from .seed import seed_definitions

settings = get_base_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        seed_definitions(db)
    start_outbox_relay(session_factory=SessionLocal, outbox_model=Outbox, producer=producer)
    yield


app = FastAPI(title="Workflow Service", version="1.0.0", lifespan=lifespan)
init_common(app, service_name="workflow-service", log_level=settings.log_level)
app.include_router(workflows.router)
app.include_router(tasks.router)
app.include_router(esign.router)
