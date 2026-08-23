import datetime as dt
import uuid

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from common.db import Base
from common.outbox import OutboxMixin


def _uuid() -> str:
    return uuid.uuid4().hex


def _now() -> dt.datetime:
    return dt.datetime.now(tz=dt.timezone.utc)


class WorkflowDefinition(Base):
    """Định nghĩa quy trình theo loại hồ sơ (data-driven, không hard-code if/else)."""

    __tablename__ = "workflow_definitions"
    doc_type: Mapped[str] = mapped_column(String(30), primary_key=True)  # CONTRACT/PRICELIST/PAYMENT
    name: Mapped[str] = mapped_column(String(150))
    steps: Mapped[list["WorkflowStepDef"]] = relationship(
        back_populates="definition", lazy="selectin", order_by="WorkflowStepDef.step_order"
    )


class WorkflowStepDef(Base):
    __tablename__ = "workflow_step_defs"
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    doc_type: Mapped[str] = mapped_column(ForeignKey("workflow_definitions.doc_type"))
    step_order: Mapped[int] = mapped_column(Integer)
    step_name: Mapped[str] = mapped_column(String(120))
    assignee_role: Mapped[str] = mapped_column(String(30))
    assignee_username: Mapped[str] = mapped_column(String(50))  # người cụ thể (demo SC-08)
    definition: Mapped[WorkflowDefinition] = relationship(back_populates="steps")


class WorkflowInstance(Base):
    __tablename__ = "workflow_instances"
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    doc_type: Mapped[str] = mapped_column(String(30), index=True)
    doc_id: Mapped[str] = mapped_column(String(60), index=True)
    doc_title: Mapped[str] = mapped_column(String(200), default="")
    requested_by: Mapped[str] = mapped_column(String(50))
    status: Mapped[str] = mapped_column(String(20), default="in_progress")
    # in_progress / approved / rejected / revision
    current_step_order: Mapped[int] = mapped_column(Integer, default=1)
    version_id: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    created_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), default=_now)
    tasks: Mapped[list["WorkflowTask"]] = relationship(
        back_populates="instance", lazy="selectin", order_by="WorkflowTask.step_order"
    )

    # Optimistic locking: chống race condition khi hai người cùng approve (SC-05)
    __mapper_args__ = {"version_id_col": version_id}


class WorkflowTask(Base):
    __tablename__ = "workflow_tasks"
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    instance_id: Mapped[str] = mapped_column(ForeignKey("workflow_instances.id"), index=True)
    step_order: Mapped[int] = mapped_column(Integer)
    step_name: Mapped[str] = mapped_column(String(120))
    assignee_role: Mapped[str] = mapped_column(String(30))
    assignee_username: Mapped[str] = mapped_column(String(50), index=True)
    status: Mapped[str] = mapped_column(String(20), default="pending")  # pending/approved/rejected
    acted_by: Mapped[str] = mapped_column(String(50), default="")
    comment: Mapped[str] = mapped_column(Text, default="")
    acted_at: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    instance: Mapped[WorkflowInstance] = relationship(back_populates="tasks")


class SigningSession(Base):
    """Phiên ký điện tử — trạng thái TÁCH BIỆT với trạng thái phê duyệt (đề mục 5.6)."""

    __tablename__ = "signing_sessions"
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    doc_type: Mapped[str] = mapped_column(String(30))
    doc_id: Mapped[str] = mapped_column(String(60), index=True)
    status: Mapped[str] = mapped_column(String(20), default="pending")
    # pending / signing / signed / failed / cancelled
    provider_ref: Mapped[str] = mapped_column(String(60), default="")
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), default=_now)
    updated_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), default=_now)


class Outbox(OutboxMixin, Base):
    pass
