import datetime as dt
import uuid

from sqlalchemy import Date, DateTime, ForeignKey, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from common.db import Base
from common.outbox import OutboxMixin


def _now() -> dt.datetime:
    return dt.datetime.now(tz=dt.timezone.utc)


class Contract(Base):
    __tablename__ = "contracts"
    code: Mapped[str] = mapped_column(String(30), primary_key=True)  # HD2026001
    customer_code: Mapped[str] = mapped_column(String(20), index=True)
    title: Mapped[str] = mapped_column(String(200), default="")
    effective_from: Mapped[dt.date | None] = mapped_column(Date, nullable=True)
    effective_to: Mapped[dt.date | None] = mapped_column(Date, nullable=True)
    value: Mapped[float] = mapped_column(Numeric(18, 2), default=0)
    payment_terms: Mapped[str] = mapped_column(Text, default="")
    service_terms: Mapped[str] = mapped_column(Text, default="")
    has_attachment: Mapped[bool] = mapped_column(default=False)  # CTR-02
    status: Mapped[str] = mapped_column(String(20), default="Draft", index=True)
    workflow_instance_id: Mapped[str] = mapped_column(String(32), default="")
    created_by: Mapped[str] = mapped_column(String(50), default="")
    created_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), default=_now)
    appendices: Mapped[list["ContractAppendix"]] = relationship(
        back_populates="contract", lazy="selectin", order_by="ContractAppendix.created_at"
    )


class ContractAppendix(Base):
    __tablename__ = "contract_appendices"
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=lambda: uuid.uuid4().hex)
    contract_code: Mapped[str] = mapped_column(ForeignKey("contracts.code"), index=True)
    title: Mapped[str] = mapped_column(String(200))
    content: Mapped[str] = mapped_column(Text, default="")
    effective_date: Mapped[dt.date | None] = mapped_column(Date, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="Effective")
    created_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), default=_now)
    contract: Mapped[Contract] = relationship(back_populates="appendices")


class Outbox(OutboxMixin, Base):
    pass
