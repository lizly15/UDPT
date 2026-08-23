"""Chuẩn hóa lỗi trả về + đăng ký exception handler cho FastAPI."""
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse


class DomainError(Exception):
    """Lỗi nghiệp vụ có mã và HTTP status (dùng cho business rule vi phạm)."""

    def __init__(self, code: str, message: str, status_code: int = 400):
        self.code = code
        self.message = message
        self.status_code = status_code
        super().__init__(message)


class ConflictError(DomainError):
    def __init__(self, code: str, message: str):
        super().__init__(code, message, status_code=409)


class NotFoundError(DomainError):
    def __init__(self, code: str, message: str):
        super().__init__(code, message, status_code=404)


def _body(code: str, message: str, details=None):
    out = {"error": {"code": code, "message": message}}
    if details is not None:
        out["error"]["details"] = details
    return out


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(DomainError)
    async def _domain(_: Request, exc: DomainError):
        return JSONResponse(status_code=exc.status_code, content=_body(exc.code, exc.message))

    @app.exception_handler(RequestValidationError)
    async def _validation(_: Request, exc: RequestValidationError):
        return JSONResponse(
            status_code=422,
            content=_body("VALIDATION_ERROR", "Dữ liệu không hợp lệ", exc.errors()),
        )
