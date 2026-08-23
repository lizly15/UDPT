from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from common.deps import CurrentUser, get_current_user

from ..database import get_db
from ..models import WorkflowInstance, WorkflowTask
from ..schemas import ActionRequest, InstanceOut, TaskOut
from ..services import engine

router = APIRouter(prefix="/tasks", tags=["tasks"])


@router.get("/inbox", response_model=list[TaskOut])
def my_inbox(user: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    """Các bước đang chờ CHÍNH user hiện tại xử lý (APR-01: theo assignee, không chỉ role)."""
    rows = db.execute(
        select(WorkflowTask)
        .join(WorkflowInstance, WorkflowTask.instance_id == WorkflowInstance.id)
        .where(
            WorkflowTask.assignee_username == user.username,
            WorkflowTask.status == "pending",
            WorkflowTask.step_order == WorkflowInstance.current_step_order,
            WorkflowInstance.status == "in_progress",
        )
    ).scalars().all()
    return rows


@router.post("/{task_id}/approve", response_model=InstanceOut)
def approve(task_id: str, body: ActionRequest,
            user: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    return engine.act(db, task_id, user, "approve", body.comment)


@router.post("/{task_id}/reject", response_model=InstanceOut)
def reject(task_id: str, body: ActionRequest,
           user: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    return engine.act(db, task_id, user, "reject", body.comment)


@router.post("/{task_id}/request-revision", response_model=InstanceOut)
def request_revision(task_id: str, body: ActionRequest,
                     user: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    return engine.act(db, task_id, user, "request_revision", body.comment)
