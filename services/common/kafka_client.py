"""Producer/Consumer Kafka gọn nhẹ trên confluent-kafka (sync).

- EventProducer: publish JSON, dùng bởi Outbox relay.
- run_consumer: vòng lặp consumer chạy trong background thread ở mỗi service cần nghe event.
"""
import json
import logging
import threading
import time
from collections.abc import Callable
from typing import Any

from confluent_kafka import Consumer, Producer

log = logging.getLogger("kafka")


class EventProducer:
    def __init__(self, bootstrap_servers: str):
        self._p = Producer({"bootstrap.servers": bootstrap_servers, "enable.idempotence": True})

    def publish(self, topic: str, key: str, value: dict[str, Any]) -> None:
        self._p.produce(topic, key=key, value=json.dumps(value, ensure_ascii=False).encode())
        self._p.poll(0)

    def flush(self, timeout: float = 5.0) -> None:
        self._p.flush(timeout)


def start_consumer_thread(
    *,
    bootstrap_servers: str,
    group_id: str,
    topics: list[str],
    handler: Callable[[str, dict[str, Any]], None],
    stop_event: threading.Event | None = None,
) -> threading.Thread:
    """Chạy consumer trong daemon thread. handler(topic, event_dict) phải idempotent."""
    stop = stop_event or threading.Event()

    def _loop() -> None:
        # Chờ Kafka sẵn sàng khi khởi động cùng docker-compose
        consumer = None
        while consumer is None and not stop.is_set():
            try:
                consumer = Consumer(
                    {
                        "bootstrap.servers": bootstrap_servers,
                        "group.id": group_id,
                        "auto.offset.reset": "earliest",
                        "enable.auto.commit": False,
                        # Tạo topic ngay khi subscribe + refresh metadata nhanh để bắt
                        # được topic mới (tránh chờ mặc định 5 phút)
                        "allow.auto.create.topics": True,
                        "topic.metadata.refresh.interval.ms": 10000,
                        # Failover nhanh: phát hiện consumer chết sau ~10s thay vì 45s mặc định
                        "session.timeout.ms": 10000,
                        "heartbeat.interval.ms": 3000,
                    }
                )
                consumer.subscribe(topics)
            except Exception as exc:  # noqa: BLE001
                log.warning("Kafka chưa sẵn sàng (%s), thử lại...", exc)
                time.sleep(3)

        log.info("Consumer '%s' nghe topic %s", group_id, topics)
        while not stop.is_set():
            msg = consumer.poll(1.0)
            if msg is None:
                continue
            if msg.error():
                log.error("Kafka error: %s", msg.error())
                continue
            try:
                event = json.loads(msg.value().decode())
                handler(msg.topic(), event)
                consumer.commit(msg)
            except Exception:  # noqa: BLE001
                log.exception("Xử lý event lỗi, sẽ không commit để retry")
                time.sleep(1)
        consumer.close()

    t = threading.Thread(target=_loop, name=f"consumer-{group_id}", daemon=True)
    t.start()
    return t
