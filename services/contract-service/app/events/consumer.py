"""Consume workflow.events để cập nhật trạng thái hợp đồng theo kết quả phê duyệt."""
import logging

from ..database import SessionLocal
from ..models import Contract
from ..services import logic

log = logging.getLogger("contract.consumer")

RELEVANT = {"DocApproved", "DocRejected", "RevisionRequested"}


def handle_event(topic: str, event: dict) -> None:
    event_type = event.get("event_type")
    data = event.get("data", {})
    if event_type not in RELEVANT or data.get("doc_type") != "CONTRACT":
        return
    code = data.get("doc_id")
    with SessionLocal() as db:
        c = db.get(Contract, code)
        if not c:
            return
        logic.apply_workflow_result(db, c, event_type)
        db.commit()
        log.info("Hợp đồng %s -> %s (%s)", code, c.status, event_type)
