"""Outbox Pattern dùng chung — chống mất event khi cập nhật DB + publish Kafka.

Cách dùng:
1. Mỗi service tạo bảng outbox bằng OutboxMixin.
2. Trong cùng transaction ghi domain, gọi add_outbox(db, ...) để chèn 1 row.
3. Relay (start_outbox_relay) chạy nền: đọc row chưa gửi -> publish Kafka -> đánh dấu sent.
"""
import datetime as dt
import logging
import threading
import time
import uuid

from sqlalchemy import Boolean, DateTime, String, Text, select
from sqlalchemy.orm import Mapped, Session, mapped_column, sessionmaker

from .kafka_client import EventProducer

log = logging.getLogger("outbox")


class OutboxMixin:
    """Kế thừa để tạo bảng outbox cho từng service (tên bảng: 'outbox')."""

    __tablename__ = "outbox"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=lambda: uuid.uuid4().hex)
    topic: Mapped[str] = mapped_column(String(120))
    event_key: Mapped[str] = mapped_column(String(120))
    event_type: Mapped[str] = mapped_column(String(120))
    payload: Mapped[str] = mapped_column(Text)  # JSON string
    created_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: dt.datetime.now(tz=dt.timezone.utc)
    )
    sent: Mapped[bool] = mapped_column(Boolean, default=False, index=True)


def add_outbox(
    db: Session,
    outbox_model: type,
    *,
    topic: str,
    key: str,
    event_type: str,
    data: dict,
) -> None:
    """Chèn 1 event vào outbox trong CÙNG transaction với thay đổi domain (không commit ở đây)."""
    import json

    envelope = {
        "event_type": event_type,
        "event_id": uuid.uuid4().hex,
        "occurred_at": dt.datetime.now(tz=dt.timezone.utc).isoformat(),
        "data": data,
    }
    db.add(
        outbox_model(
            topic=topic,
            event_key=key,
            event_type=event_type,
            payload=json.dumps(envelope, ensure_ascii=False),
        )
    )


def start_outbox_relay(
    *,
    session_factory: sessionmaker,
    outbox_model: type,
    producer: EventProducer,
    poll_interval: float = 2.0,
    batch_size: int = 50,
    stop_event: threading.Event | None = None,
) -> threading.Thread:
    stop = stop_event or threading.Event()

    def _loop() -> None:
        import json

        while not stop.is_set():
            try:
                with session_factory() as db:
                    rows = (
                        db.execute(
                            select(outbox_model)
                            .where(outbox_model.sent.is_(False))
                            .order_by(outbox_model.created_at)
                            .limit(batch_size)
                        )
                        .scalars()
                        .all()
                    )
                    for row in rows:
                        producer.publish(row.topic, row.event_key, json.loads(row.payload))
                        row.sent = True
                    if rows:
                        producer.flush()
                        db.commit()
                        log.info("Outbox relay đã publish %d event", len(rows))
            except Exception:  # noqa: BLE001
                log.exception("Outbox relay lỗi, thử lại sau")
            time.sleep(poll_interval)

    t = threading.Thread(target=_loop, name="outbox-relay", daemon=True)
    t.start()
    return t
