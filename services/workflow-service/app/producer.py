"""Producer Kafka + Outbox relay dùng chung trong workflow-service."""
from common.config import get_base_settings
from common.kafka_client import EventProducer

settings = get_base_settings()
producer = EventProducer(settings.kafka_bootstrap_servers)

TOPIC_WORKFLOW = "workflow.events"
TOPIC_ESIGN = "esign.events"
