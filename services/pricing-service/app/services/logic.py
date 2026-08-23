"""Business rules bảng giá (PRC-01..06)."""
import datetime as dt

from sqlalchemy import select
from sqlalchemy.orm import Session

from common.errors import ConflictError, DomainError
from common.outbox import add_outbox

from ..models import Outbox, PriceItem, PriceListVersion
from ..producer import TOPIC_PRICING


def emit(db: Session, event_type: str, v: PriceListVersion, extra: dict | None = None) -> None:
    data = {"doc_type": "PRICELIST", "doc_id": v.id, "price_list_code": v.price_list_code,
            "version_no": v.version_no, "status": v.status}
    if extra:
        data.update(extra)
    add_outbox(db, Outbox, topic=TOPIC_PRICING, key=v.price_list_code,
               event_type=event_type, data=data)


def validate_dates(effective_from: dt.date, effective_to: dt.date) -> None:
    # PRC-02
    if effective_from > effective_to:
        raise DomainError("BAD_EFFECTIVE", "Ngày bắt đầu không được lớn hơn ngày kết thúc")


def check_overlap(db: Session, v: PriceListVersion) -> None:
    """PRC-03: không cho hai version cùng bảng giá bị chồng thời gian hiệu lực."""
    others = db.execute(
        select(PriceListVersion).where(
            PriceListVersion.price_list_code == v.price_list_code,
            PriceListVersion.id != v.id,
            PriceListVersion.status.in_(["Submitted", "Approved", "Effective"]),
        )
    ).scalars().all()
    for o in others:
        if v.effective_from <= o.effective_to and o.effective_from <= v.effective_to:
            raise ConflictError(
                "EFFECTIVE_OVERLAP",
                f"Chồng thời gian hiệu lực với version {o.version_no} "
                f"({o.effective_from}..{o.effective_to})",
            )


def apply_workflow_result(db: Session, v: PriceListVersion, event_type: str) -> None:
    if v.status != "Submitted":
        return
    if event_type == "DocApproved":
        v.status = "Effective"
        # PRC-04: cap các version Effective cũ bị chồng để giữ lịch sử theo ngày
        prev = db.execute(
            select(PriceListVersion).where(
                PriceListVersion.price_list_code == v.price_list_code,
                PriceListVersion.id != v.id,
                PriceListVersion.status == "Effective",
            )
        ).scalars().all()
        for o in prev:
            if o.effective_from < v.effective_from <= o.effective_to:
                o.effective_to = v.effective_from - dt.timedelta(days=1)
            o.status = "Superseded"
        emit(db, "PriceListEffective", v)
    elif event_type == "DocRejected":
        v.status = "Rejected"  # PRC-06: có thể sửa lại & submit lại
        emit(db, "PriceListRejected", v)
    elif event_type == "RevisionRequested":
        v.status = "Draft"
        emit(db, "PriceListRevision", v)


def find_effective_price(db: Session, *, customer_code: str, service_code: str,
                         on_date: dt.date):
    """Tra đơn giá áp dụng cho dịch vụ tại một ngày (dùng bởi billing).

    Chọn theo ngày -> giữ đúng lịch sử (SC-10: tính tháng 09 vẫn dùng giá cũ).
    """
    rows = db.execute(
        select(PriceListVersion, PriceItem)
        .join(PriceItem, PriceItem.version_id == PriceListVersion.id)
        .join(PriceListVersion.price_list)
        .where(
            PriceItem.service_code == service_code,
            PriceListVersion.effective_from <= on_date,
            PriceListVersion.effective_to >= on_date,
            PriceListVersion.status.in_(["Effective", "Superseded"]),
        )
    ).all()
    # lọc theo khách hàng
    from ..models import PriceList

    best = None
    for ver, item in rows:
        pl = db.get(PriceList, ver.price_list_code)
        if pl and pl.customer_code == customer_code:
            if best is None or ver.version_no > best[0].version_no:
                best = (ver, item)
    return best
