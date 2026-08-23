"""Mock E-Sign Provider — mô phỏng dịch vụ ký điện tử bên thứ ba (bất đồng bộ).

Nhận yêu cầu ký, trả 202 ngay, rồi sau một khoảng trễ gọi callback về workflow-service.
Quy ước demo: doc_id kết thúc bằng '-FAIL' -> ký thất bại (phục vụ kịch bản SC-06 gửi ký lại).
"""
import asyncio
import logging
import uuid

import httpx
from fastapi import FastAPI
from pydantic import BaseModel

from common.app import init_common
from common.config import get_base_settings

settings = get_base_settings()
log = logging.getLogger("mock-esign")

app = FastAPI(title="Mock E-Sign Provider", version="1.0.0")
init_common(app, service_name="mock-esign", log_level=settings.log_level)

SIGN_DELAY_SECONDS = 2.0


class SignRequest(BaseModel):
    session_id: str
    doc_type: str
    doc_id: str
    callback_url: str


async def _do_callback(req: SignRequest) -> None:
    await asyncio.sleep(SIGN_DELAY_SECONDS)
    result = "failed" if req.doc_id.endswith("-FAIL") else "signed"
    payload = {
        "session_id": req.session_id,
        "result": result,
        "provider_ref": f"ESIGN-{uuid.uuid4().hex[:10].upper()}",
    }
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            await client.post(req.callback_url, json=payload)
        log.info("Callback %s -> %s (%s)", req.doc_id, result, req.callback_url)
    except httpx.RequestError as exc:
        log.error("Callback thất bại: %s", exc)


@app.post("/sign", status_code=202)
async def sign(req: SignRequest):
    """Tiếp nhận yêu cầu ký, xử lý bất đồng bộ và callback sau."""
    asyncio.create_task(_do_callback(req))
    return {"status": "accepted", "session_id": req.session_id}
