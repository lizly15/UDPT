"""Điều phối ký điện tử (bất đồng bộ). Trạng thái phiên ký TÁCH BIỆT trạng thái duyệt.

Luồng: start_signing -> gọi mock-esign (HTTP) -> mock-esign callback -> handle_callback
-> phát esign.events (Signed/SignFailed) -> billing-service cập nhật bảng thanh toán.
"""
import datetime as dt
import logging

import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session

from common.outbox import add_outbox

from ..config import wf_settings
from ..models import Outbox, SigningSession
from ..producer import TOPIC_ESIGN

log = logging.getLogger("esign")


def start_signing(db: Session, *, doc_type: str, doc_id: str) -> SigningSession:
    session = SigningSession(doc_type=doc_type, doc_id=doc_id, status="signing", attempts=1)
    db.add(session)
    db.flush()
    add_outbox(db, Outbox, topic=TOPIC_ESIGN, key=doc_id, event_type="SigningRequested",
               data={"doc_type": doc_type, "doc_id": doc_id, "session_id": session.id})
    db.commit()
    db.refresh(session)

    callback = f"{wf_settings.self_url}/internal/esign/callback"
    try:
        httpx.post(
            f"{wf_settings.mock_esign_url}/sign",
            json={"session_id": session.id, "doc_type": doc_type,
                  "doc_id": doc_id, "callback_url": callback},
            timeout=5.0,
        )
    except httpx.RequestError as exc:
        # APR-07: dịch vụ ký lỗi tạm thời -> đánh dấu failed để retry, không hỏng dữ liệu đã duyệt
        log.warning("Gọi mock-esign lỗi: %s", exc)
        session.status = "failed"
        session.updated_at = dt.datetime.now(tz=dt.timezone.utc)
        add_outbox(db, Outbox, topic=TOPIC_ESIGN, key=doc_id, event_type="SignFailed",
                   data={"doc_type": doc_type, "doc_id": doc_id, "session_id": session.id,
                         "reason": "esign_unreachable"})
        db.commit()
    return session


def handle_callback(db: Session, *, session_id: str, result: str, provider_ref: str = "") -> None:
    session = db.get(SigningSession, session_id)
    if not session:
        return
    if session.status in ("signed", "failed", "cancelled"):
        return  # idempotent
    session.provider_ref = provider_ref
    session.updated_at = dt.datetime.now(tz=dt.timezone.utc)
    if result == "signed":
        session.status = "signed"
        add_outbox(db, Outbox, topic=TOPIC_ESIGN, key=session.doc_id, event_type="Signed",
                   data={"doc_type": session.doc_type, "doc_id": session.doc_id,
                         "session_id": session.id, "provider_ref": provider_ref})
    else:
        session.status = "failed"
        add_outbox(db, Outbox, topic=TOPIC_ESIGN, key=session.doc_id, event_type="SignFailed",
                   data={"doc_type": session.doc_type, "doc_id": session.doc_id,
                         "session_id": session.id, "reason": result})
    db.commit()


def retry_signing(db: Session, *, doc_id: str) -> SigningSession:
    """PAY-07 / SC-06: cho phép gửi ký lại khi thất bại."""
    session = db.execute(
        select(SigningSession).where(SigningSession.doc_id == doc_id)
        .order_by(SigningSession.created_at.desc())
    ).scalars().first()
    if session and session.status == "failed":
        return start_signing(db, doc_type=session.doc_type, doc_id=doc_id)
    return session
