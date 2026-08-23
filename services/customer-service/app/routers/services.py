from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from common.deps import get_current_user, require_roles
from common.errors import ConflictError

from ..database import get_db
from ..models import ServiceCatalog
from ..schemas import ServiceCreate, ServiceOut

router = APIRouter(prefix="/services", tags=["service-catalog"])


@router.get("", response_model=list[ServiceOut], dependencies=[Depends(get_current_user)])
def list_services(db: Session = Depends(get_db)):
    return db.execute(select(ServiceCatalog).order_by(ServiceCatalog.code)).scalars().all()


@router.post("", response_model=ServiceOut, status_code=201,
             dependencies=[Depends(require_roles("SALES", "SALES_MANAGER", "ADMIN"))])
def create_service(body: ServiceCreate, db: Session = Depends(get_db)):
    if db.get(ServiceCatalog, body.code):
        raise ConflictError("SERVICE_EXISTS", "Mã dịch vụ đã tồn tại")
    s = ServiceCatalog(**body.model_dump())
    db.add(s)
    db.commit()
    db.refresh(s)
    return s
