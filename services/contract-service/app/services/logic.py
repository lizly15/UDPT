"""Business rules & state machine cho hợp đồng (CTR-01..07)."""
import datetime as dt

from sqlalchemy.orm import Session

from common.errors import ConflictError, DomainError
from common.outbox import add_outbox

from ..models import Contract, Outbox
from ..producer import TOPIC_CONTRACT

EDITABLE = {"Draft", "RevisionRequested"}


def emit(db: Session, event_type: str, c: Contract, extra: dict | None = None) -> None:
    data = {"doc_type": "CONTRACT", "doc_id": c.code, "customer_code": c.customer_code,
            "status": c.status, "title": c.title}
    if extra:
        data.update(extra)
    add_outbox(db, Outbox, topic=TOPIC_CONTRACT, key=c.code, event_type=event_type, data=data)


def ensure_editable(c: Contract) -> None:
    # CTR-01: chỉ sửa ở Draft / RevisionRequested
    if c.status not in EDITABLE:
        raise ConflictError("NOT_EDITABLE", f"Hợp đồng ở trạng thái {c.status} không được chỉnh sửa")


def validate_for_submit(c: Contract) -> None:
    # CTR-02: cần khách hàng, thời gian hiệu lực hợp lệ, có tài liệu/nội dung bắt buộc
    if not c.customer_code:
        raise DomainError("NO_CUSTOMER", "Hợp đồng phải có khách hàng")
    if not c.effective_from or not c.effective_to:
        raise DomainError("NO_EFFECTIVE", "Phải có thời gian hiệu lực")
    if c.effective_from > c.effective_to:
        raise DomainError("BAD_EFFECTIVE", "Ngày bắt đầu không được lớn hơn ngày kết thúc")
    if not c.has_attachment:
        raise DomainError("NO_ATTACHMENT", "Phải đính kèm tài liệu trước khi Submit")


def apply_workflow_result(db: Session, c: Contract, event_type: str) -> None:
    """Được gọi bởi consumer khi nhận kết quả từ workflow-service."""
    if c.status != "Submitted":
        return  # idempotent / bỏ qua nếu không còn ở bước chờ duyệt
    if event_type == "DocApproved":
        c.status = "Approved"  # CTR-03: chỉ tới Approved qua quy trình duyệt
        emit(db, "ContractApproved", c)
    elif event_type == "DocRejected":
        c.status = "Rejected"
        emit(db, "ContractRejected", c)
    elif event_type == "RevisionRequested":
        c.status = "RevisionRequested"
        emit(db, "ContractRevisionRequested", c)


def activate(c: Contract) -> None:
    # CTR-05: Approved -> Active chỉ khi đã tới ngày hiệu lực
    if c.status != "Approved":
        raise ConflictError("NOT_APPROVED", "Chỉ hợp đồng Approved mới được kích hoạt")
    today = dt.date.today()
    if c.effective_from and today < c.effective_from:
        raise DomainError("NOT_YET_EFFECTIVE", "Chưa tới ngày hiệu lực")
    c.status = "Active"


def cancel(c: Contract) -> None:
    # CTR-06: Active không được xóa, nhưng được chuyển Cancelled
    if c.status in ("Expired", "Cancelled"):
        raise ConflictError("BAD_STATE", f"Không thể hủy ở trạng thái {c.status}")
    c.status = "Cancelled"
