from fastapi import APIRouter, Depends, Header
from sqlalchemy import select
from sqlalchemy.orm import Session

from common.deps import CurrentUser, get_current_user, require_roles
from common.errors import ConflictError, NotFoundError

from ..database import get_db
from ..models import Contract, ContractAppendix
from ..schemas import AppendixCreate, ContractCreate, ContractOut, ContractUpdate
from ..services import logic
from ..services.workflow_client import create_workflow_instance

router = APIRouter(prefix="/contracts", tags=["contracts"])
WRITE = ("SALES", "SALES_MANAGER", "ADMIN")


def _get(db: Session, code: str) -> Contract:
    c = db.get(Contract, code)
    if not c:
        raise NotFoundError("CONTRACT_NOT_FOUND", "Không tìm thấy hợp đồng")
    return c


@router.get("", response_model=list[ContractOut], dependencies=[Depends(get_current_user)])
def list_contracts(customer_code: str | None = None, status: str | None = None,
                   db: Session = Depends(get_db)):
    stmt = select(Contract)
    if customer_code:
        stmt = stmt.where(Contract.customer_code == customer_code)
    if status:
        stmt = stmt.where(Contract.status == status)
    return db.execute(stmt.order_by(Contract.code)).scalars().all()


@router.get("/{code}", response_model=ContractOut, dependencies=[Depends(get_current_user)])
def get_contract(code: str, db: Session = Depends(get_db)):
    return _get(db, code)


@router.post("", response_model=ContractOut, status_code=201)
def create_contract(body: ContractCreate, user: CurrentUser = Depends(require_roles(*WRITE)),
                    db: Session = Depends(get_db)):
    if db.get(Contract, body.code):
        raise ConflictError("CONTRACT_EXISTS", "Mã hợp đồng đã tồn tại")
    c = Contract(**body.model_dump(), status="Draft", created_by=user.username)
    db.add(c)
    logic.emit(db, "ContractCreated", c)
    db.commit()
    db.refresh(c)
    return c


@router.put("/{code}", response_model=ContractOut)
def update_contract(code: str, body: ContractUpdate,
                    user: CurrentUser = Depends(require_roles(*WRITE)),
                    db: Session = Depends(get_db)):
    c = _get(db, code)
    logic.ensure_editable(c)  # CTR-01
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(c, k, v)
    db.commit()
    db.refresh(c)
    return c


@router.post("/{code}/submit", response_model=ContractOut)
def submit_contract(code: str, user: CurrentUser = Depends(require_roles(*WRITE)),
                    authorization: str = Header(default=""), db: Session = Depends(get_db)):
    c = _get(db, code)
    if c.status not in logic.EDITABLE:
        raise ConflictError("NOT_SUBMITTABLE", f"Không thể submit ở trạng thái {c.status}")
    logic.validate_for_submit(c)  # CTR-02
    instance_id = create_workflow_instance(
        doc_id=c.code, doc_title=c.title or c.code, requested_by=user.username,
        authorization=authorization,
    )
    c.workflow_instance_id = instance_id
    c.status = "Submitted"
    logic.emit(db, "ContractSubmitted", c, {"instance_id": instance_id, "requested_by": user.username})
    db.commit()
    db.refresh(c)
    return c


@router.post("/{code}/activate", response_model=ContractOut)
def activate_contract(code: str, user: CurrentUser = Depends(require_roles(*WRITE)),
                      db: Session = Depends(get_db)):
    c = _get(db, code)
    logic.activate(c)  # CTR-05
    logic.emit(db, "ContractActivated", c)
    db.commit()
    db.refresh(c)
    return c


@router.post("/{code}/cancel", response_model=ContractOut)
def cancel_contract(code: str, user: CurrentUser = Depends(require_roles(*WRITE)),
                    db: Session = Depends(get_db)):
    c = _get(db, code)
    logic.cancel(c)  # CTR-06
    logic.emit(db, "ContractCancelled", c)
    db.commit()
    db.refresh(c)
    return c


# ---- Phụ lục hợp đồng (4.3, CTR-07) ----
@router.get("/{code}/appendices", dependencies=[Depends(get_current_user)])
def list_appendices(code: str, db: Session = Depends(get_db)):
    _get(db, code)
    return db.execute(
        select(ContractAppendix).where(ContractAppendix.contract_code == code)
    ).scalars().all()


@router.post("/{code}/appendices", status_code=201)
def create_appendix(code: str, body: AppendixCreate,
                    user: CurrentUser = Depends(require_roles(*WRITE)),
                    db: Session = Depends(get_db)):
    c = _get(db, code)
    # CTR-07: chỉ tạo phụ lục cho hợp đồng đã Approved/Active
    if c.status not in ("Approved", "Active"):
        raise ConflictError("APPENDIX_NOT_ALLOWED",
                            "Chỉ tạo phụ lục cho hợp đồng Approved/Active")
    ap = ContractAppendix(contract_code=code, title=body.title, content=body.content,
                          effective_date=body.effective_date)
    db.add(ap)
    logic.emit(db, "AppendixCreated", c, {"appendix_title": body.title})
    db.commit()
    db.refresh(ap)
    return {"id": ap.id, "contract_code": code, "title": ap.title, "status": ap.status}
