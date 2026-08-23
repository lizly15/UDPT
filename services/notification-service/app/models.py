import datetime as dt
import uuid

from sqlalchemy import Boolean, DateTime, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from common.db import Base


def _uuid() -> str:
    return uuid.uuid4().hex


def _now() -> dt.datetime:
    return dt.datetime.now(tz=dt.timezone.utc)


class Notification(Base):
    __tablename__ = "notifications"
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    recipient: Mapped[str] = mapped_column(String(50), index=True)  # username
    title: Mapped[str] = mapped_column(String(200))
    body: Mapped[str] = mapped_column(Text, default="")
    doc_type: Mapped[str] = mapped_column(String(30), default="")
    doc_id: Mapped[str] = mapped_column(String(60), default="")
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    created_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), default=_now)


class AuditLog(Base):
    """Nhật ký truy vết (4.10) — độc lập với dữ liệu hiển thị hiện tại."""

    __tablename__ = "audit_logs"
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    ts: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), default=_now, index=True)
    actor: Mapped[str] = mapped_column(String(50), default="system")
    action: Mapped[str] = mapped_column(String(60))       # event_type
    doc_type: Mapped[str] = mapped_column(String(30), default="")
    doc_id: Mapped[str] = mapped_column(String(60), default="", index=True)
    detail: Mapped[str] = mapped_column(Text, default="")  # JSON payload
