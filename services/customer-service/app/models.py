import datetime as dt

from sqlalchemy import DateTime, String
from sqlalchemy.orm import Mapped, mapped_column

from common.db import Base


class Customer(Base):
    __tablename__ = "customers"
    code: Mapped[str] = mapped_column(String(20), primary_key=True)  # KH0001
    name: Mapped[str] = mapped_column(String(200))
    tax_code: Mapped[str] = mapped_column(String(20), default="")     # MST
    customer_type: Mapped[str] = mapped_column(String(40), default="")  # Logistics/FMCG/...
    address: Mapped[str] = mapped_column(String(300), default="")
    representative: Mapped[str] = mapped_column(String(150), default="")
    contact: Mapped[str] = mapped_column(String(150), default="")
    status: Mapped[str] = mapped_column(String(20), default="Active")  # Active/Inactive
    created_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: dt.datetime.now(tz=dt.timezone.utc)
    )


class ServiceCatalog(Base):
    __tablename__ = "services"
    code: Mapped[str] = mapped_column(String(20), primary_key=True)  # DV001
    name: Mapped[str] = mapped_column(String(200))
    unit: Mapped[str] = mapped_column(String(40), default="")        # Container/Ngày/Chuyến...
