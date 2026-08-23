"""Business logic bảng thanh toán (PAY-01..07)."""
import calendar
import datetime as dt
import uuid

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from common.errors import ConflictError, DomainError
from common.outbox import add_outbox

from ..config import bl_settings
from ..models import Outbox, PaymentLine, PaymentStatement, VolumeRecord
from ..producer import TOPIC_BILLING
from . import clients


def emit(db: Session, event_type: str, s: PaymentStatement, extra: dict | None = None) -> None:
    data = {"doc_type": "PAYMENT", "doc_id": s.id, "code": s.code,
            "customer_code": s.customer_code, "status": s.status, "total": float(s.total)}
    if extra:
        data.update(extra)
    add_outbox(db, Outbox, topic=TOPIC_BILLING, key=s.id, event_type=event_type, data=data)


def _period_bounds(period: str) -> tuple[dt.date, dt.date]:
    year, month = int(period[:4]), int(period[5:7])
    last = calendar.monthrange(year, month)[1]
    return dt.date(year, month, 1), dt.date(year, month, last)


def generate_statement(db: Session, *, customer_code: str, contract_code: str, period: str,
                       created_by: str, authorization: str) -> PaymentStatement:
    period_start, _ = _period_bounds(period)

    # PAY-01 + SC-03: hợp đồng phải còn hiệu lực tại kỳ tính phí
    contract = clients.get_contract(contract_code, authorization)
    if not contract:
        raise DomainError("CONTRACT_NOT_FOUND", "Không tìm thấy hợp đồng")
    if contract["status"] not in ("Active", "Approved"):
        raise DomainError("CONTRACT_NOT_ACTIVE",
                          f"Hợp đồng đang ở trạng thái {contract['status']}")
    eff_to = contract.get("effective_to")
    if eff_to and dt.date.fromisoformat(eff_to) < period_start:
        raise DomainError("CONTRACT_EXPIRED", "Hợp đồng đã hết hạn tại kỳ tính phí")

    # tránh trùng: đã có bảng thanh toán còn hiệu lực cho cùng kỳ
    dup = db.execute(
        select(PaymentStatement).where(
            PaymentStatement.customer_code == customer_code,
            PaymentStatement.period == period,
            PaymentStatement.status.notin_(["Rejected"]),
        )
    ).scalar_one_or_none()
    if dup:
        raise ConflictError("STATEMENT_EXISTS",
                            f"Đã có bảng thanh toán kỳ {period} (mã {dup.code})")

    # PAY-02: chỉ dùng sản lượng đã KHÓA KỲ, thuộc đúng kỳ
    grouped = db.execute(
        select(VolumeRecord.service_code, func.sum(VolumeRecord.quantity))
        .where(
            VolumeRecord.customer_code == customer_code,
            VolumeRecord.period == period,
            VolumeRecord.locked.is_(True),
        )
        .group_by(VolumeRecord.service_code)
    ).all()
    if not grouped:
        raise DomainError("NO_VOLUME", "Chưa có sản lượng đã khóa kỳ cho kỳ này")

    stmt = PaymentStatement(
        code=f"PAY-{period}-{uuid.uuid4().hex[:6].upper()}",
        customer_code=customer_code, contract_code=contract_code, period=period,
        status="Draft", created_by=created_by,
    )
    subtotal = 0.0
    for service_code, qty in grouped:
        qty = float(qty)
        price = clients.get_effective_price(customer_code, service_code, period_start, authorization)
        if price is None:
            raise DomainError("NO_PRICE", f"Thiếu bảng giá hiệu lực cho {service_code}")
        amount = qty * price  # PAY-03: đơn giá được copy cứng vào dòng
        stmt.lines.append(PaymentLine(service_code=service_code, quantity=qty,
                                      unit_price=price, amount=amount))
        subtotal += amount

    stmt.subtotal = subtotal
    stmt.tax = round(subtotal * bl_settings.tax_rate, 2)
    stmt.total = stmt.subtotal + stmt.tax
    db.add(stmt)
    db.flush()  # sinh stmt.id trước khi ghi outbox (event_key = id)
    emit(db, "PaymentGenerated", stmt)
    db.commit()
    db.refresh(stmt)
    return stmt


def apply_workflow_result(db: Session, s: PaymentStatement, event_type: str) -> None:
    if event_type == "DocApproved" and s.status == "Submitted":
        s.status = "Approved"      # PAY-06: workflow sẽ tự khởi động ký sau khi Approved
        emit(db, "PaymentApproved", s)
    elif event_type == "DocRejected" and s.status == "Submitted":
        s.status = "Rejected"
        emit(db, "PaymentRejected", s)
    elif event_type == "RevisionRequested" and s.status == "Submitted":
        s.status = "Draft"


def apply_esign_result(db: Session, s: PaymentStatement, event_type: str) -> None:
    if event_type == "SigningRequested" and s.status == "Approved":
        s.status = "Signing"
    elif event_type == "Signed":
        s.status = "Issued"        # ký xong -> phát hành
        emit(db, "PaymentIssued", s)
    elif event_type == "SignFailed":
        s.status = "SignFailed"    # PAY-07: phản ánh rõ để xử lý lại
