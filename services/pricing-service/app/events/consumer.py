"""Consume workflow.events để cập nhật trạng thái version bảng giá."""
import logging

from ..database import SessionLocal
from ..models import PriceListVersion
from ..services import logic

log = logging.getLogger("pricing.consumer")
RELEVANT = {"DocApproved", "DocRejected", "RevisionRequested"}


def handle_event(topic: str, event: dict) -> None:
    event_type = event.get("event_type")
    data = event.get("data", {})
    if event_type not in RELEVANT or data.get("doc_type") != "PRICELIST":
        return
    version_id = data.get("doc_id")
    with SessionLocal() as db:
        v = db.get(PriceListVersion, version_id)
        if not v:
            return
        logic.apply_workflow_result(db, v, event_type)
        db.commit()
        log.info("Bảng giá version %s -> %s", version_id, v.status)
