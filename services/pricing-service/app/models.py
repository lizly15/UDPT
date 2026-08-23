import datetime as dt
import uuid

from sqlalchemy import Date, DateTime, ForeignKey, Integer, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from common.db import Base
from common.outbox import OutboxMixin


def _uuid() -> str:
    return uuid.uuid4().hex


def _now() -> dt.datetime:
    return dt.datetime.now(tz=dt.timezone.utc)


class PriceList(Base):
    """Bảng giá logic gắn với 1 đối tượng áp dụng (khách hàng)."""

    __tablename__ = "price_lists"
    code: Mapped[str] = mapped_column(String(30), primary_key=True)   # PL-KH0001
    name: Mapped[str] = mapped_column(String(200))
    customer_code: Mapped[str] = mapped_column(String(20), index=True)  # PRC-01: phạm vi áp dụng
    created_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), default=_now)
    versions: Mapped[list["PriceListVersion"]] = relationship(
        back_populates="price_list", lazy="selectin", order_by="PriceListVersion.version_no"
    )


class PriceListVersion(Base):
    __tablename__ = "price_list_versions"
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    price_list_code: Mapped[str] = mapped_column(ForeignKey("price_lists.code"), index=True)
    version_no: Mapped[int] = mapped_column(Integer, default=1)
    effective_from: Mapped[dt.date] = mapped_column(Date)
    effective_to: Mapped[dt.date] = mapped_column(Date)
    status: Mapped[str] = mapped_column(String(20), default="Draft", index=True)
    # Draft / Submitted / Approved / Effective / Superseded / Rejected
    workflow_instance_id: Mapped[str] = mapped_column(String(32), default="")
    created_by: Mapped[str] = mapped_column(String(50), default="")
    created_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), default=_now)
    price_list: Mapped[PriceList] = relationship(back_populates="versions")
    items: Mapped[list["PriceItem"]] = relationship(
        back_populates="version", lazy="selectin", cascade="all, delete-orphan"
    )


class PriceItem(Base):
    __tablename__ = "price_items"
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    version_id: Mapped[str] = mapped_column(ForeignKey("price_list_versions.id"), index=True)
    service_code: Mapped[str] = mapped_column(String(20))
    unit_price: Mapped[float] = mapped_column(Numeric(18, 2))
    version: Mapped[PriceListVersion] = relationship(back_populates="items")


class Outbox(OutboxMixin, Base):
    pass
