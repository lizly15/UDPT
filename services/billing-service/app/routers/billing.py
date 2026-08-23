from fastapi import APIRouter, Depends, Header
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from common.deps import CurrentUser, get_current_user, require_roles
from common.errors import ConflictError, NotFoundError

from ..database import get_db
from ..models import PaymentStatement, VolumeRecord
from ..schemas import (
    GenerateRequest,
    LockRequest,
    StatementOut,
    VolumeCreate,
    VolumeOut,
)
from ..services import clients, logic

router = APIRouter(tags=["billing"])
OPS = ("OPERATIONS", "ADMIN")
ACC = ("ACCOUNTANT", "ADMIN")


# ---------- Sản lượng (4.5) ----------
@router.post("/volumes", response_model=VolumeOut, status_code=201)
def create_volume(body: VolumeCreate, user: CurrentUser = Depends(require_roles(*OPS)),
                  db: Session = Depends(get_db)):
    period = body.record_date.strftime("%Y-%m")
    v = VolumeRecord(customer_code=body.customer_code, service_code=body.service_code,
                     record_date=body.record_date, period=period, quantity=body.quantity,
                     created_by=user.username)
    db.add(v)
    db.commit()
    db.refresh(v)
    return v


@router.get("/volumes", response_model=list[VolumeOut], dependencies=[Depends(get_current_user)])
def list_volumes(customer_code: str | None = None, period: str | None = None,
                 db: Session = Depends(get_db)):
    stmt = select(VolumeRecord)
    if customer_code:
        stmt = stmt.where(VolumeRecord.customer_code == customer_code)
    if period:
        stmt = stmt.where(VolumeRecord.period == period)
    return db.execute(stmt.order_by(VolumeRecord.record_date)).scalars().all()


@router.post("/volumes/lock")
def lock_period(body: LockRequest, user: CurrentUser = Depends(require_roles(*OPS)),
                db: Session = Depends(get_db)):
    """Khóa kỳ: sau khi khóa, sản lượng mới được dùng để lập bảng thanh toán (PAY-02)."""
    db.execute(
        update(VolumeRecord)
        .where(VolumeRecord.customer_code == body.customer_code,
               VolumeRecord.period == body.period)
        .values(locked=True)
    )
    db.commit()
    return {"status": "locked", "customer_code": body.customer_code, "period": body.period}


# ---------- Bảng thanh toán (4.6) ----------
@router.post("/payments/generate", response_model=StatementOut, status_code=201)
def generate(body: GenerateRequest, user: CurrentUser = Depends(require_roles(*ACC)),
             authorization: str = Header(default=""), db: Session = Depends(get_db)):
    return logic.generate_statement(
        db, customer_code=body.customer_code, contract_code=body.contract_code,
        period=body.period, created_by=user.username, authorization=authorization,
    )


@router.get("/payments", response_model=list[StatementOut],
            dependencies=[Depends(get_current_user)])
def list_payments(customer_code: str | None = None, status: str | None = None,
                  db: Session = Depends(get_db)):
    stmt = select(PaymentStatement)
    if customer_code:
        stmt = stmt.where(PaymentStatement.customer_code == customer_code)
    if status:
        stmt = stmt.where(PaymentStatement.status == status)
    return db.execute(stmt.order_by(PaymentStatement.created_at.desc())).scalars().all()


@router.get("/payments/{statement_id}", response_model=StatementOut,
            dependencies=[Depends(get_current_user)])
def get_payment(statement_id: str, db: Session = Depends(get_db)):
    s = db.get(PaymentStatement, statement_id)
    if not s:
        raise NotFoundError("STATEMENT_NOT_FOUND", "Không tìm thấy bảng thanh toán")
    return s


@router.post("/payments/{statement_id}/submit", response_model=StatementOut)
def submit_payment(statement_id: str, user: CurrentUser = Depends(require_roles(*ACC)),
                   authorization: str = Header(default=""), db: Session = Depends(get_db)):
    s = db.get(PaymentStatement, statement_id)
    if not s:
        raise NotFoundError("STATEMENT_NOT_FOUND", "Không tìm thấy bảng thanh toán")
    if s.status != "Draft":
        raise ConflictError("NOT_SUBMITTABLE", f"Không thể submit ở trạng thái {s.status}")
    # PAY-04: không submit nếu tổng tiền <= 0 hoặc thiếu dòng dịch vụ
    if not s.lines or float(s.total) <= 0:
        raise ConflictError("INVALID_TOTAL", "Bảng thanh toán rỗng hoặc tổng tiền không hợp lệ")
    instance_id = clients.create_workflow_instance(
        doc_id=s.id, doc_title=s.code, requested_by=user.username, authorization=authorization,
    )
    s.workflow_instance_id = instance_id
    s.status = "Submitted"
    logic.emit(db, "PaymentSubmitted", s, {"requested_by": user.username})
    db.commit()
    db.refresh(s)
    return s
