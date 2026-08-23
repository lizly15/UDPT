"""Endpoint nội bộ nhận callback từ mock-esign (bất đồng bộ) + xem/retry phiên ký."""
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from common.deps import get_current_user

from ..database import get_db
from ..models import SigningSession
from ..services import esign

router = APIRouter(tags=["esign"])


class CallbackBody(BaseModel):
    session_id: str
    result: str          # signed | failed
    provider_ref: str = ""


@router.post("/internal/esign/callback")
def esign_callback(body: CallbackBody, db: Session = Depends(get_db)):
    # Endpoint nội bộ (mock-esign gọi service-to-service, không qua gateway)
    esign.handle_callback(db, session_id=body.session_id, result=body.result,
                          provider_ref=body.provider_ref)
    return {"status": "ok"}


@router.get("/workflows/esign/{doc_id}", dependencies=[Depends(get_current_user)])
def get_session(doc_id: str, db: Session = Depends(get_db)):
    s = db.execute(
        select(SigningSession).where(SigningSession.doc_id == doc_id)
        .order_by(SigningSession.created_at.desc())
    ).scalars().first()
    if not s:
        return {"doc_id": doc_id, "status": "none"}
    return {"doc_id": doc_id, "status": s.status, "attempts": s.attempts,
            "provider_ref": s.provider_ref}


@router.post("/workflows/esign/{doc_id}/retry", dependencies=[Depends(get_current_user)])
def retry(doc_id: str, db: Session = Depends(get_db)):
    s = esign.retry_signing(db, doc_id=doc_id)
    return {"doc_id": doc_id, "status": s.status if s else "none"}
