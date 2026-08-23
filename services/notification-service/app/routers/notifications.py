from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from common.deps import CurrentUser, get_current_user, require_roles
from common.errors import NotFoundError

from ..database import get_db
from ..models import AuditLog, Notification

router = APIRouter(tags=["notifications"])


@router.get("/notifications")
def my_notifications(unread_only: bool = False,
                     user: CurrentUser = Depends(get_current_user),
                     db: Session = Depends(get_db)):
    stmt = select(Notification).where(Notification.recipient == user.username)
    if unread_only:
        stmt = stmt.where(Notification.is_read.is_(False))
    rows = db.execute(stmt.order_by(Notification.created_at.desc()).limit(100)).scalars().all()
    return [{"id": n.id, "title": n.title, "body": n.body, "doc_type": n.doc_type,
             "doc_id": n.doc_id, "is_read": n.is_read,
             "created_at": n.created_at.isoformat()} for n in rows]


@router.post("/notifications/{notif_id}/read")
def mark_read(notif_id: str, user: CurrentUser = Depends(get_current_user),
              db: Session = Depends(get_db)):
    n = db.get(Notification, notif_id)
    if not n or n.recipient != user.username:
        raise NotFoundError("NOTIFICATION_NOT_FOUND", "Không tìm thấy thông báo")
    n.is_read = True
    db.commit()
    return {"status": "ok"}


@router.get("/audit")
def audit_logs(doc_id: str | None = None, doc_type: str | None = None,
               user: CurrentUser = Depends(require_roles("ADMIN", "DIRECTOR", "ACCOUNTANT")),
               db: Session = Depends(get_db)):
    """Truy vết theo hồ sơ (4.10). Giới hạn cho vai trò quản lý."""
    stmt = select(AuditLog)
    if doc_id:
        stmt = stmt.where(AuditLog.doc_id == doc_id)
    if doc_type:
        stmt = stmt.where(AuditLog.doc_type == doc_type)
    rows = db.execute(stmt.order_by(AuditLog.ts.desc()).limit(200)).scalars().all()
    return [{"ts": a.ts.isoformat(), "actor": a.actor, "action": a.action,
             "doc_type": a.doc_type, "doc_id": a.doc_id} for a in rows]
