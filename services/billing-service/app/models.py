import datetime as dt
import uuid

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from common.db import Base
from common.outbox import OutboxMixin


def _uuid() -> str:
    return uuid.uuid4().hex


def _now() -> dt.datetime:
    return dt.datetime.now(tz=dt.timezone.utc)


class VolumeRecord(Base):
    """Sản lượng thực hiện (4.5)."""

    __tablename__ = "volume_records"
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    customer_code: Mapped[str] = mapped_column(String(20), index=True)
    service_code: Mapped[str] = mapped_column(String(20))
    record_date: Mapped[dt.date] = mapped_column(Date)
    period: Mapped[str] = mapped_column(String(7), index=True)  # YYYY-MM
    quantity: Mapped[float] = mapped_column(Numeric(18, 2))
    locked: Mapped[bool] = mapped_column(Boolean, default=False)  # khóa kỳ
    created_by: Mapped[str] = mapped_column(String(50), default="")
    created_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), default=_now)


class PaymentStatement(Base):
    """Bảng thanh toán (4.6)."""

    __tablename__ = "payment_statements"
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    code: Mapped[str] = mapped_column(String(40), unique=True, index=True)
    customer_code: Mapped[str] = mapped_column(String(20), index=True)
    contract_code: Mapped[str] = mapped_column(String(30))
    period: Mapped[str] = mapped_column(String(7))
    status: Mapped[str] = mapped_column(String(20), default="Draft", index=True)
    # Draft/Submitted/Approved/Signing/Signed/Issued/Rejected/SignFailed
    subtotal: Mapped[float] = mapped_column(Numeric(18, 2), default=0)
    tax: Mapped[float] = mapped_column(Numeric(18, 2), default=0)
    total: Mapped[float] = mapped_column(Numeric(18, 2), default=0)
    workflow_instance_id: Mapped[str] = mapped_column(String(32), default="")
    created_by: Mapped[str] = mapped_column(String(50), default="")
    created_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), default=_now)
    lines: Mapped[list["PaymentLine"]] = relationship(
        back_populates="statement", lazy="selectin", cascade="all, delete-orphan"
    )


class PaymentLine(Base):
    __tablename__ = "payment_lines"
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    statement_id: Mapped[str] = mapped_column(ForeignKey("payment_statements.id"), index=True)
    service_code: Mapped[str] = mapped_column(String(20))
    quantity: Mapped[float] = mapped_column(Numeric(18, 2))
    unit_price: Mapped[float] = mapped_column(Numeric(18, 2))  # PAY-03: copy giá tại thời điểm tính
    amount: Mapped[float] = mapped_column(Numeric(18, 2))
    statement: Mapped[PaymentStatement] = relationship(back_populates="lines")


class Outbox(OutboxMixin, Base):
    pass
