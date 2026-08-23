"""Engine phê duyệt: đọc định nghĩa từ DB (data-driven), thực thi các business rule APR-01..07."""
import datetime as dt

from sqlalchemy import select
from sqlalchemy.orm import Session
from sqlalchemy.orm.exc import StaleDataError

from common.deps import CurrentUser
from common.errors import ConflictError, DomainError, NotFoundError
from common.outbox import add_outbox

from ..models import (
    Outbox,
    WorkflowDefinition,
    WorkflowInstance,
    WorkflowStepDef,
    WorkflowTask,
)
from ..producer import TOPIC_WORKFLOW


def _emit(db: Session, event_type: str, inst: WorkflowInstance, extra: dict) -> None:
    data = {
        "doc_type": inst.doc_type,
        "doc_id": inst.doc_id,
        "doc_title": inst.doc_title,
        "instance_id": inst.id,
        "requested_by": inst.requested_by,
        **extra,
    }
    add_outbox(db, Outbox, topic=TOPIC_WORKFLOW, key=inst.doc_id,
               event_type=event_type, data=data)


def create_instance(db: Session, *, doc_type: str, doc_id: str, doc_title: str,
                    requested_by: str) -> WorkflowInstance:
    definition = db.get(WorkflowDefinition, doc_type)
    if not definition:
        raise NotFoundError("DEFINITION_NOT_FOUND", f"Chưa cấu hình quy trình cho {doc_type}")

    # Idempotency: mỗi hồ sơ chỉ có 1 instance đang mở (chống double-submit SC-09)
    existing = db.execute(
        select(WorkflowInstance).where(
            WorkflowInstance.doc_type == doc_type,
            WorkflowInstance.doc_id == doc_id,
            WorkflowInstance.status.in_(["in_progress"]),
        )
    ).scalar_one_or_none()
    if existing:
        return existing

    steps = db.execute(
        select(WorkflowStepDef)
        .where(WorkflowStepDef.doc_type == doc_type)
        .order_by(WorkflowStepDef.step_order)
    ).scalars().all()
    if not steps:
        raise DomainError("NO_STEPS", "Quy trình chưa có bước nào")

    inst = WorkflowInstance(
        doc_type=doc_type, doc_id=doc_id, doc_title=doc_title,
        requested_by=requested_by, status="in_progress", current_step_order=1,
    )
    db.add(inst)
    db.flush()
    for s in steps:
        db.add(WorkflowTask(
            instance_id=inst.id, step_order=s.step_order, step_name=s.step_name,
            assignee_role=s.assignee_role, assignee_username=s.assignee_username,
        ))
    db.flush()
    first = steps[0]
    _emit(db, "StepAssigned", inst, {
        "step_order": first.step_order, "step_name": first.step_name,
        "assignee_username": first.assignee_username,
    })
    db.commit()
    db.refresh(inst)
    return inst


def _current_task(db: Session, inst: WorkflowInstance) -> WorkflowTask:
    task = db.execute(
        select(WorkflowTask).where(
            WorkflowTask.instance_id == inst.id,
            WorkflowTask.step_order == inst.current_step_order,
        )
    ).scalar_one_or_none()
    if not task:
        raise NotFoundError("TASK_NOT_FOUND", "Không tìm thấy bước hiện tại")
    return task


def act(db: Session, task_id: str, user: CurrentUser, action: str, comment: str) -> WorkflowInstance:
    """action: approve | reject | request_revision. Áp dụng APR-01..05 + optimistic lock (SC-05)."""
    task = db.get(WorkflowTask, task_id)
    if not task:
        raise NotFoundError("TASK_NOT_FOUND", "Không tìm thấy task")
    inst = db.get(WorkflowInstance, task.instance_id)

    if inst.status != "in_progress":
        raise ConflictError("INSTANCE_CLOSED", "Hồ sơ không còn ở trạng thái xử lý")
    # APR-02: không duyệt nhảy bước / duyệt lại bước đã xong
    if task.step_order != inst.current_step_order or task.status != "pending":
        raise ConflictError("NOT_CURRENT_STEP", "Đây không phải bước đang chờ xử lý")
    # APR-01 + SC-08: chỉ đúng người được giao ở bước hiện tại (không chỉ đúng role)
    if user.username != task.assignee_username:
        raise DomainError(
            "NOT_ASSIGNEE",
            f"Bạn không phải người được giao bước này (assignee: {task.assignee_username})",
            status_code=403,
        )
    # APR-03: reject / request_revision phải có lý do
    if action in ("reject", "request_revision") and not comment.strip():
        raise DomainError("COMMENT_REQUIRED", "Phải nhập lý do khi từ chối/yêu cầu chỉnh sửa")

    task.acted_by = user.username
    task.comment = comment
    task.acted_at = dt.datetime.now(tz=dt.timezone.utc)

    try:
        if action == "approve":
            task.status = "approved"
            steps = inst.tasks
            if task.step_order >= max(t.step_order for t in steps):
                # APR-05: bước cuối được duyệt -> hồ sơ Approved + phát event
                inst.status = "approved"
                _emit(db, "DocApproved", inst, {"actor": user.username})
            else:
                inst.current_step_order += 1
                nxt = _current_task(db, inst)
                _emit(db, "StepAssigned", inst, {
                    "step_order": nxt.step_order, "step_name": nxt.step_name,
                    "assignee_username": nxt.assignee_username,
                })
        elif action == "reject":
            task.status = "rejected"
            inst.status = "rejected"
            _emit(db, "DocRejected", inst, {"actor": user.username, "reason": comment})
        elif action == "request_revision":
            task.status = "revision"
            inst.status = "revision"
            _emit(db, "RevisionRequested", inst, {"actor": user.username, "reason": comment})
        else:
            raise DomainError("BAD_ACTION", "Hành động không hợp lệ")
        db.commit()
    except StaleDataError:
        db.rollback()
        raise ConflictError("CONCURRENT_UPDATE", "Bước này vừa được xử lý bởi request khác")

    db.refresh(inst)

    # APR-05/06 + PAY-06: bảng thanh toán được duyệt nội bộ -> tự động gửi ký điện tử
    if action == "approve" and inst.status == "approved" and inst.doc_type == "PAYMENT":
        from .esign import start_signing

        start_signing(db, doc_type=inst.doc_type, doc_id=inst.doc_id)
    return inst
