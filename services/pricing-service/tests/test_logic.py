"""Unit test business rule bảng giá (PRC-02/03) + chọn giá theo ngày (SC-10)."""
import datetime as dt

import pytest

from app.models import PriceItem, PriceList, PriceListVersion
from app.services import logic
from common.errors import ConflictError, DomainError


# PRC-02
def test_validate_dates_rejects_from_after_to():
    with pytest.raises(DomainError) as e:
        logic.validate_dates(dt.date(2026, 12, 1), dt.date(2026, 1, 1))
    assert e.value.code == "BAD_EFFECTIVE"


def test_validate_dates_ok():
    logic.validate_dates(dt.date(2026, 1, 1), dt.date(2026, 12, 31))


def _seed_version(db, code, vno, ef, et, status, price):
    if not db.get(PriceList, code):
        db.add(PriceList(code=code, name="BG", customer_code="KH0001"))
        db.flush()
    v = PriceListVersion(price_list_code=code, version_no=vno,
                         effective_from=ef, effective_to=et, status=status)
    v.items = [PriceItem(service_code="DV003", unit_price=price)]
    db.add(v)
    db.flush()
    return v


# PRC-03
def test_check_overlap_detects_conflict(db):
    _seed_version(db, "PL1", 1, dt.date(2026, 7, 1), dt.date(2026, 9, 30), "Effective", 120000)
    newv = _seed_version(db, "PL1", 2, dt.date(2026, 8, 1), dt.date(2026, 8, 31), "Draft", 130000)
    with pytest.raises(ConflictError) as e:
        logic.check_overlap(db, newv)
    assert e.value.code == "EFFECTIVE_OVERLAP"


def test_check_overlap_ok_when_no_overlap(db):
    _seed_version(db, "PL2", 1, dt.date(2026, 7, 1), dt.date(2026, 9, 30), "Effective", 120000)
    newv = _seed_version(db, "PL2", 2, dt.date(2026, 10, 1), dt.date(2026, 12, 31), "Draft", 150000)
    logic.check_overlap(db, newv)  # không raise


# SC-10: tính kỳ cũ dùng giá cũ, kỳ mới dùng giá mới
def test_find_effective_price_by_date(db):
    _seed_version(db, "PL3", 1, dt.date(2026, 7, 1), dt.date(2026, 9, 30), "Superseded", 120000)
    _seed_version(db, "PL3", 2, dt.date(2026, 10, 1), dt.date(2027, 6, 30), "Effective", 150000)

    sep = logic.find_effective_price(db, customer_code="KH0001",
                                     service_code="DV003", on_date=dt.date(2026, 9, 15))
    oct_ = logic.find_effective_price(db, customer_code="KH0001",
                                      service_code="DV003", on_date=dt.date(2026, 10, 15))
    assert sep is not None and float(sep[1].unit_price) == 120000
    assert oct_ is not None and float(oct_[1].unit_price) == 150000


def test_find_effective_price_none_when_out_of_range(db):
    _seed_version(db, "PL4", 1, dt.date(2026, 7, 1), dt.date(2026, 9, 30), "Effective", 120000)
    assert logic.find_effective_price(db, customer_code="KH0001",
                                      service_code="DV003", on_date=dt.date(2026, 12, 1)) is None
