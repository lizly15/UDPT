import datetime as dt

from fastapi import APIRouter, Depends, Header
from sqlalchemy import select
from sqlalchemy.orm import Session

from common.deps import CurrentUser, get_current_user, require_roles
from common.errors import ConflictError, NotFoundError

from ..database import get_db
from ..models import PriceItem, PriceList, PriceListVersion
from ..schemas import (
    EffectivePrice,
    PriceListCreate,
    PriceListOut,
    VersionCreate,
    VersionOut,
)
from ..services import logic
from ..services.workflow_client import create_workflow_instance

router = APIRouter(prefix="/pricing", tags=["pricing"])
WRITE = ("SALES", "SALES_MANAGER", "ADMIN")


@router.get("/lists", response_model=list[PriceListOut], dependencies=[Depends(get_current_user)])
def list_price_lists(customer_code: str | None = None, db: Session = Depends(get_db)):
    stmt = select(PriceList)
    if customer_code:
        stmt = stmt.where(PriceList.customer_code == customer_code)
    return db.execute(stmt.order_by(PriceList.code)).scalars().all()


@router.post("/lists", response_model=PriceListOut, status_code=201,
             dependencies=[Depends(require_roles(*WRITE))])
def create_price_list(body: PriceListCreate, db: Session = Depends(get_db)):
    if db.get(PriceList, body.code):
        raise ConflictError("PRICELIST_EXISTS", "Mã bảng giá đã tồn tại")
    pl = PriceList(**body.model_dump())
    db.add(pl)
    db.commit()
    db.refresh(pl)
    return pl


@router.post("/lists/{code}/versions", response_model=VersionOut, status_code=201)
def create_version(code: str, body: VersionCreate,
                   user: CurrentUser = Depends(require_roles(*WRITE)),
                   db: Session = Depends(get_db)):
    pl = db.get(PriceList, code)
    if not pl:
        raise NotFoundError("PRICELIST_NOT_FOUND", "Không tìm thấy bảng giá")
    logic.validate_dates(body.effective_from, body.effective_to)  # PRC-02
    last = db.execute(
        select(PriceListVersion).where(PriceListVersion.price_list_code == code)
        .order_by(PriceListVersion.version_no.desc())
    ).scalars().first()
    version_no = (last.version_no + 1) if last else 1
    v = PriceListVersion(
        price_list_code=code, version_no=version_no,
        effective_from=body.effective_from, effective_to=body.effective_to,
        status="Draft", created_by=user.username,
    )
    v.items = [PriceItem(service_code=i.service_code, unit_price=i.unit_price) for i in body.items]
    db.add(v)
    db.commit()
    db.refresh(v)
    return v


@router.get("/versions/{version_id}", response_model=VersionOut,
            dependencies=[Depends(get_current_user)])
def get_version(version_id: str, db: Session = Depends(get_db)):
    v = db.get(PriceListVersion, version_id)
    if not v:
        raise NotFoundError("VERSION_NOT_FOUND", "Không tìm thấy version")
    return v


@router.post("/versions/{version_id}/submit", response_model=VersionOut)
def submit_version(version_id: str, user: CurrentUser = Depends(require_roles(*WRITE)),
                   authorization: str = Header(default=""), db: Session = Depends(get_db)):
    v = db.get(PriceListVersion, version_id)
    if not v:
        raise NotFoundError("VERSION_NOT_FOUND", "Không tìm thấy version")
    if v.status not in ("Draft", "Rejected"):
        raise ConflictError("NOT_SUBMITTABLE", f"Không thể submit ở trạng thái {v.status}")
    if not v.items:
        raise ConflictError("NO_ITEMS", "Bảng giá phải có ít nhất một dòng dịch vụ")
    logic.check_overlap(db, v)  # PRC-03
    instance_id = create_workflow_instance(
        doc_id=v.id, doc_title=f"{v.price_list_code} v{v.version_no}",
        requested_by=user.username, authorization=authorization,
    )
    v.workflow_instance_id = instance_id
    v.status = "Submitted"
    logic.emit(db, "PriceListSubmitted", v, {"requested_by": user.username})
    db.commit()
    db.refresh(v)
    return v


@router.get("/effective", response_model=EffectivePrice, dependencies=[Depends(get_current_user)])
def effective_price(customer_code: str, service_code: str, date: dt.date,
                    db: Session = Depends(get_db)):
    """Đơn giá áp dụng cho dịch vụ tại một ngày (billing gọi khi lập bảng thanh toán)."""
    best = logic.find_effective_price(db, customer_code=customer_code,
                                      service_code=service_code, on_date=date)
    if not best:
        raise NotFoundError("NO_EFFECTIVE_PRICE",
                            f"Không có giá hiệu lực cho {service_code} ngày {date}")
    ver, item = best
    return EffectivePrice(customer_code=customer_code, service_code=service_code, date=date,
                          unit_price=float(item.unit_price), version_id=ver.id,
                          version_no=ver.version_no)
