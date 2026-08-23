from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from common.deps import get_current_user, require_roles
from common.errors import ConflictError, NotFoundError

from ..database import get_db
from ..models import Customer
from ..schemas import CustomerCreate, CustomerOut, CustomerUpdate, StatusUpdate

router = APIRouter(prefix="/customers", tags=["customers"])

# Ai cũng đọc được; chỉ Kinh doanh/Admin được tạo & sửa
WRITE_ROLES = ("SALES", "SALES_MANAGER", "ADMIN")


@router.get("", response_model=list[CustomerOut], dependencies=[Depends(get_current_user)])
def list_customers(status: str | None = None, db: Session = Depends(get_db)):
    stmt = select(Customer)
    if status:
        stmt = stmt.where(Customer.status == status)
    return db.execute(stmt.order_by(Customer.code)).scalars().all()


@router.get("/{code}", response_model=CustomerOut, dependencies=[Depends(get_current_user)])
def get_customer(code: str, db: Session = Depends(get_db)):
    c = db.get(Customer, code)
    if not c:
        raise NotFoundError("CUSTOMER_NOT_FOUND", "Không tìm thấy khách hàng")
    return c


@router.post("", response_model=CustomerOut, status_code=201,
             dependencies=[Depends(require_roles(*WRITE_ROLES))])
def create_customer(body: CustomerCreate, db: Session = Depends(get_db)):
    if db.get(Customer, body.code):
        raise ConflictError("CUSTOMER_EXISTS", "Mã khách hàng đã tồn tại")
    c = Customer(**body.model_dump())
    db.add(c)
    db.commit()
    db.refresh(c)
    return c


@router.put("/{code}", response_model=CustomerOut,
            dependencies=[Depends(require_roles(*WRITE_ROLES))])
def update_customer(code: str, body: CustomerUpdate, db: Session = Depends(get_db)):
    c = db.get(Customer, code)
    if not c:
        raise NotFoundError("CUSTOMER_NOT_FOUND", "Không tìm thấy khách hàng")
    for k, v in body.model_dump().items():
        setattr(c, k, v)
    db.commit()
    db.refresh(c)
    return c


@router.patch("/{code}/status", response_model=CustomerOut,
              dependencies=[Depends(require_roles(*WRITE_ROLES))])
def set_status(code: str, body: StatusUpdate, db: Session = Depends(get_db)):
    """Tạm ngưng / kích hoạt khách hàng (4.1)."""
    c = db.get(Customer, code)
    if not c:
        raise NotFoundError("CUSTOMER_NOT_FOUND", "Không tìm thấy khách hàng")
    c.status = body.status
    db.commit()
    db.refresh(c)
    return c
