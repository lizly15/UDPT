"""Unit test engine phê duyệt (APR-01/02/03/05) — data-driven, dùng SQLite."""
import pytest

from app.models import WorkflowDefinition, WorkflowStepDef
from app.services import engine
from common.deps import CurrentUser
from common.errors import ConflictError, DomainError


def _seed_contract_def(db):
    db.add(WorkflowDefinition(doc_type="CONTRACT", name="Duyệt HĐ"))
    steps = [
        (1, "Trưởng phòng KD", "SALES_MANAGER", "manager01"),
        (2, "Giám đốc", "DIRECTOR", "director01"),
    ]
    for order, name, role, user in steps:
        db.add(WorkflowStepDef(doc_type="CONTRACT", step_order=order, step_name=name,
                               assignee_role=role, assignee_username=user))
    db.commit()


def _user(username, *roles):
    return CurrentUser(user_id=username, roles=list(roles), username=username)


def test_create_instance_makes_tasks(db):
    _seed_contract_def(db)
    inst = engine.create_instance(db, doc_type="CONTRACT", doc_id="HD1",
                                  doc_title="HD1", requested_by="sale01")
    assert inst.status == "in_progress"
    assert inst.current_step_order == 1
    assert len(inst.tasks) == 2


def test_create_instance_idempotent(db):
    _seed_contract_def(db)
    a = engine.create_instance(db, doc_type="CONTRACT", doc_id="HD1", doc_title="", requested_by="x")
    b = engine.create_instance(db, doc_type="CONTRACT", doc_id="HD1", doc_title="", requested_by="x")
    assert a.id == b.id  # chỉ 1 instance đang mở (SC-09)


def _first_task(inst):
    return sorted(inst.tasks, key=lambda t: t.step_order)[0]


# APR-01 / SC-08
def test_approve_wrong_assignee_blocked(db):
    _seed_contract_def(db)
    inst = engine.create_instance(db, doc_type="CONTRACT", doc_id="HD1", doc_title="", requested_by="x")
    task = _first_task(inst)
    with pytest.raises(DomainError) as e:
        engine.act(db, task.id, _user("ops01", "OPERATIONS"), "approve", "")
    assert e.value.code == "NOT_ASSIGNEE"
    assert e.value.status_code == 403


# APR-03
def test_reject_requires_comment(db):
    _seed_contract_def(db)
    inst = engine.create_instance(db, doc_type="CONTRACT", doc_id="HD1", doc_title="", requested_by="x")
    task = _first_task(inst)
    with pytest.raises(DomainError) as e:
        engine.act(db, task.id, _user("manager01", "SALES_MANAGER"), "reject", "   ")
    assert e.value.code == "COMMENT_REQUIRED"


# APR-05: duyệt hết các bước -> Approved
def test_full_approval_chain(db):
    _seed_contract_def(db)
    inst = engine.create_instance(db, doc_type="CONTRACT", doc_id="HD1", doc_title="", requested_by="x")
    t1 = _first_task(inst)
    engine.act(db, t1.id, _user("manager01", "SALES_MANAGER"), "approve", "ok")
    assert inst.current_step_order == 2
    t2 = sorted(inst.tasks, key=lambda t: t.step_order)[1]
    engine.act(db, t2.id, _user("director01", "DIRECTOR"), "approve", "ok")
    assert inst.status == "approved"


# APR-02: không duyệt nhảy bước
def test_cannot_approve_non_current_step(db):
    _seed_contract_def(db)
    inst = engine.create_instance(db, doc_type="CONTRACT", doc_id="HD1", doc_title="", requested_by="x")
    t2 = sorted(inst.tasks, key=lambda t: t.step_order)[1]  # bước 2 khi đang ở bước 1
    with pytest.raises(ConflictError) as e:
        engine.act(db, t2.id, _user("director01", "DIRECTOR"), "approve", "ok")
    assert e.value.code == "NOT_CURRENT_STEP"


# reject -> instance rejected
def test_reject_sets_rejected(db):
    _seed_contract_def(db)
    inst = engine.create_instance(db, doc_type="CONTRACT", doc_id="HD1", doc_title="", requested_by="x")
    t1 = _first_task(inst)
    engine.act(db, t1.id, _user("manager01", "SALES_MANAGER"), "reject", "thiếu giấy tờ")
    assert inst.status == "rejected"
