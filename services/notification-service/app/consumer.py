"""Consume TẤT CẢ event nghiệp vụ -> ghi audit log (mọi event) + sinh thông báo (một số event)."""
import json
import logging

from .database import SessionLocal
from .models import AuditLog, Notification

log = logging.getLogger("notification.consumer")

# event_type -> (người nhận lấy từ field nào, tiêu đề thông báo)
NOTIFY_RULES = {
    "StepAssigned": ("assignee_username", "Có hồ sơ cần duyệt"),
    "DocApproved": ("requested_by", "Hồ sơ đã được duyệt"),
    "DocRejected": ("requested_by", "Hồ sơ bị từ chối"),
    "RevisionRequested": ("requested_by", "Hồ sơ cần chỉnh sửa"),
    "Signed": ("requested_by", "Đã ký điện tử thành công"),
    "SignFailed": ("requested_by", "Ký điện tử thất bại"),
}


def handle_event(topic: str, event: dict) -> None:
    event_type = event.get("event_type", "")
    data = event.get("data", {})
    with SessionLocal() as db:
        # 4.10: audit log cho MỌI event (không phụ thuộc dữ liệu hiển thị hiện tại)
        db.add(AuditLog(
            actor=data.get("actor") or data.get("requested_by") or "system",
            action=event_type,
            doc_type=data.get("doc_type", ""),
            doc_id=str(data.get("doc_id", "")),
            detail=json.dumps(data, ensure_ascii=False),
        ))
        # 4.9: thông báo cho một số loại event
        rule = NOTIFY_RULES.get(event_type)
        if rule:
            field, title = rule
            recipient = data.get(field)
            if recipient:
                db.add(Notification(
                    recipient=recipient, title=title,
                    body=f"{data.get('doc_type','')} {data.get('doc_id','')}"
                         + (f" — {data.get('reason')}" if data.get("reason") else ""),
                    doc_type=data.get("doc_type", ""), doc_id=str(data.get("doc_id", "")),
                ))
        db.commit()
    log.info("Event %s (%s) đã xử lý", event_type, topic)
