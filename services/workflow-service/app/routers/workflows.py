from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from common.deps import get_current_user
from common.errors import NotFoundError

from ..database import get_db
from ..models import WorkflowDefinition, WorkflowInstance
from ..schemas import CreateInstanceRequest, InstanceOut
from ..services import engine

router = APIRouter(prefix="/workflows", tags=["workflows"])


@router.post("/instances", response_model=InstanceOut,
             dependencies=[Depends(get_current_user)])
def create_instance(body: CreateInstanceRequest, db: Session = Depends(get_db)):
    """Được gọi bởi các service nghiệp vụ khi hồ sơ được Submit."""
    inst = engine.create_instance(
        db, doc_type=body.doc_type, doc_id=body.doc_id,
        doc_title=body.doc_title, requested_by=body.requested_by,
    )
    return inst


@router.get("/instances/{instance_id}", response_model=InstanceOut,
            dependencies=[Depends(get_current_user)])
def get_instance(instance_id: str, db: Session = Depends(get_db)):
    inst = db.get(WorkflowInstance, instance_id)
    if not inst:
        raise NotFoundError("INSTANCE_NOT_FOUND", "Không tìm thấy workflow instance")
    return inst


@router.get("/by-doc/{doc_type}/{doc_id}", response_model=InstanceOut,
            dependencies=[Depends(get_current_user)])
def get_by_doc(doc_type: str, doc_id: str, db: Session = Depends(get_db)):
    inst = db.execute(
        select(WorkflowInstance).where(
            WorkflowInstance.doc_type == doc_type, WorkflowInstance.doc_id == doc_id,
        ).order_by(WorkflowInstance.created_at.desc())
    ).scalars().first()
    if not inst:
        raise NotFoundError("INSTANCE_NOT_FOUND", "Hồ sơ chưa có quy trình")
    return inst


@router.get("/definitions", dependencies=[Depends(get_current_user)])
def list_definitions(db: Session = Depends(get_db)):
    defs = db.execute(select(WorkflowDefinition)).scalars().all()
    return [
        {"doc_type": d.doc_type, "name": d.name,
         "steps": [{"order": s.step_order, "name": s.step_name,
                    "role": s.assignee_role, "assignee": s.assignee_username} for s in d.steps]}
        for d in defs
    ]
