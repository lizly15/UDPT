from contextlib import asynccontextmanager

from fastapi import FastAPI

from common.app import init_common
from common.config import get_base_settings
from common.db import Base
from common.kafka_client import start_consumer_thread

from .consumer import handle_event
from .database import engine
from .routers import notifications

settings = get_base_settings()

TOPICS = ["workflow.events", "contract.events", "pricing.events",
          "billing.events", "esign.events"]


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(engine)
    start_consumer_thread(
        bootstrap_servers=settings.kafka_bootstrap_servers,
        group_id="notification-service",
        topics=TOPICS,
        handler=handle_event,
    )
    yield


app = FastAPI(title="Notification Service", version="1.0.0", lifespan=lifespan)
init_common(app, service_name="notification-service", log_level=settings.log_level)
app.include_router(notifications.router)
