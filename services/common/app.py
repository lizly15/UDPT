"""Helper khởi tạo FastAPI app chung: logging, exception handler, request-id, healthz."""
from fastapi import FastAPI, Request

from .errors import register_exception_handlers
from .logging import new_request_id, setup_logging


def init_common(app: FastAPI, *, service_name: str, log_level: str = "INFO") -> None:
    setup_logging(log_level)
    register_exception_handlers(app)

    @app.middleware("http")
    async def _request_id(request: Request, call_next):
        rid = request.headers.get("X-Request-Id") or new_request_id()
        response = await call_next(request)
        response.headers["X-Request-Id"] = rid
        return response

    @app.get("/healthz", tags=["infra"])
    def healthz():  # noqa: ANN202
        return {"status": "ok", "service": service_name}
