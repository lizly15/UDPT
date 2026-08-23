"""Consume workflow.events (kết quả duyệt) + esign.events (kết quả ký) cho bảng thanh toán."""
import logging

from sqlalchemy import select

from .database import SessionLocal
from .models import PaymentStatement
from .services import logic

log = logging.getLogger("billing.consumer")


def _find(db, doc_id: str) -> PaymentStatement | None:
    return db.get(PaymentStatement, doc_id) or db.execute(
        select(PaymentStatement).where(PaymentStatement.id == doc_id)
    ).scalar_one_or_none()


def handle_event(topic: str, event: dict) -> None:
    event_type = event.get("event_type", "")
    data = event.get("data", {})
    if data.get("doc_type") != "PAYMENT":
        return
    doc_id = data.get("doc_id")
    with SessionLocal() as db:
        s = _find(db, doc_id)
        if not s:
            return
        if topic == "workflow.events":
            logic.apply_workflow_result(db, s, event_type)
        elif topic == "esign.events":
            logic.apply_esign_result(db, s, event_type)
        db.commit()
        log.info("Bảng thanh toán %s -> %s (%s)", s.code, s.status, event_type)
