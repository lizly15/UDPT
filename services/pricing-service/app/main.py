from contextlib import asynccontextmanager

from fastapi import FastAPI

from common.app import init_common
from common.config import get_base_settings
from common.db import Base
from common.kafka_client import start_consumer_thread
from common.outbox import start_outbox_relay

from .database import SessionLocal, engine
from .events.consumer import handle_event
from .models import Outbox
from .producer import producer
from .routers import pricing

settings = get_base_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(engine)
    start_outbox_relay(session_factory=SessionLocal, outbox_model=Outbox, producer=producer)
    start_consumer_thread(
        bootstrap_servers=settings.kafka_bootstrap_servers,
        group_id="pricing-service",
        topics=["workflow.events"],
        handler=handle_event,
    )
    yield


app = FastAPI(title="Pricing Service", version="1.0.0", lifespan=lifespan)
init_common(app, service_name="pricing-service", log_level=settings.log_level)
app.include_router(pricing.router)
