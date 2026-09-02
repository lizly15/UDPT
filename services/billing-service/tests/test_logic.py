"""Unit test bảng thanh toán (PAY): mốc kỳ, kết quả duyệt & ký."""
import datetime as dt

from app.models import PaymentStatement
from app.services import logic


def test_period_bounds():
    start, end = logic._period_bounds("2026-08")
    assert start == dt.date(2026, 8, 1)
    assert end == dt.date(2026, 8, 31)


def test_period_bounds_february_leap():
    start, end = logic._period_bounds("2028-02")
    assert end == dt.date(2028, 2, 29)


def _stmt(db, status):
    s = PaymentStatement(code="PAY-1", customer_code="KH0001", contract_code="HD1",
                         period="2026-08", status=status, subtotal=100, tax=0, total=100)
    db.add(s)
    db.flush()
    return s


# DocApproved: Submitted -> Approved
def test_apply_workflow_approved(db):
    s = _stmt(db, "Submitted")
    logic.apply_workflow_result(db, s, "DocApproved")
    assert s.status == "Approved"


def test_apply_workflow_rejected(db):
    s = _stmt(db, "Submitted")
    logic.apply_workflow_result(db, s, "DocRejected")
    assert s.status == "Rejected"


# Signed -> Issued (phát hành)
def test_apply_esign_signed_issues(db):
    s = _stmt(db, "Approved")
    logic.apply_esign_result(db, s, "Signed")
    assert s.status == "Issued"


# PAY-07: ký thất bại phản ánh rõ
def test_apply_esign_failed(db):
    s = _stmt(db, "Approved")
    logic.apply_esign_result(db, s, "SignFailed")
    assert s.status == "SignFailed"
