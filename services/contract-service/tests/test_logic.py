"""Unit test business rule hợp đồng (CTR-01..07)."""
import datetime as dt

import pytest

from app.models import Contract
from app.services import logic
from common.errors import ConflictError, DomainError


def _contract(**kw) -> Contract:
    base = dict(code="HD1", customer_code="KH0001", title="t",
                effective_from=dt.date(2026, 1, 1), effective_to=dt.date(2026, 12, 31),
                has_attachment=True, status="Draft")
    base.update(kw)
    return Contract(**base)


# CTR-01
def test_ensure_editable_ok_when_draft():
    logic.ensure_editable(_contract(status="Draft"))  # không raise


def test_ensure_editable_blocks_when_approved():
    with pytest.raises(ConflictError):
        logic.ensure_editable(_contract(status="Approved"))


# CTR-02
def test_validate_submit_requires_attachment():
    with pytest.raises(DomainError) as e:
        logic.validate_for_submit(_contract(has_attachment=False))
    assert e.value.code == "NO_ATTACHMENT"


def test_validate_submit_requires_effective_dates():
    with pytest.raises(DomainError) as e:
        logic.validate_for_submit(_contract(effective_from=None))
    assert e.value.code == "NO_EFFECTIVE"


def test_validate_submit_rejects_from_after_to():
    c = _contract(effective_from=dt.date(2026, 12, 1), effective_to=dt.date(2026, 1, 1))
    with pytest.raises(DomainError) as e:
        logic.validate_for_submit(c)
    assert e.value.code == "BAD_EFFECTIVE"


def test_validate_submit_ok():
    logic.validate_for_submit(_contract())  # không raise


# CTR-05
def test_activate_requires_approved():
    with pytest.raises(ConflictError):
        logic.activate(_contract(status="Draft"))


def test_activate_blocks_before_effective_date():
    c = _contract(status="Approved", effective_from=dt.date.today() + dt.timedelta(days=5))
    with pytest.raises(DomainError) as e:
        logic.activate(c)
    assert e.value.code == "NOT_YET_EFFECTIVE"


def test_activate_ok_when_effective():
    c = _contract(status="Approved", effective_from=dt.date(2020, 1, 1))
    logic.activate(c)
    assert c.status == "Active"


# CTR-06
def test_cancel_active_ok():
    c = _contract(status="Active")
    logic.cancel(c)
    assert c.status == "Cancelled"


def test_cancel_blocks_expired():
    with pytest.raises(ConflictError):
        logic.cancel(_contract(status="Expired"))


# CTR-03: kết quả duyệt propagate
def test_apply_workflow_result_approved(db):
    c = _contract(status="Submitted")
    db.add(c)
    db.flush()
    logic.apply_workflow_result(db, c, "DocApproved")
    assert c.status == "Approved"
