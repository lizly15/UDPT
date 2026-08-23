"""Dependency xác thực JWT dùng chung cho mọi service phía sau gateway.

Gateway đã verify token, nhưng mỗi service vẫn tự verify lại (zero-trust nội bộ)
và trích xuất user_id + roles để phân quyền.
"""
from dataclasses import dataclass

import jwt
from fastapi import Depends, Header

from .config import get_base_settings
from .errors import DomainError


@dataclass
class CurrentUser:
    user_id: str
    roles: list[str]
    username: str | None = None

    def has_role(self, *roles: str) -> bool:
        return any(r in self.roles for r in roles)


def _unauthorized(msg: str) -> DomainError:
    return DomainError("UNAUTHORIZED", msg, status_code=401)


def get_current_user(authorization: str | None = Header(default=None)) -> CurrentUser:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise _unauthorized("Thiếu Bearer token")
    token = authorization.split(" ", 1)[1].strip()
    s = get_base_settings()
    try:
        payload = jwt.decode(token, s.jwt_secret, algorithms=[s.jwt_algorithm])
    except jwt.ExpiredSignatureError:
        raise _unauthorized("Token hết hạn")
    except jwt.PyJWTError:
        raise _unauthorized("Token không hợp lệ")
    if payload.get("type") != "access":
        raise _unauthorized("Sai loại token")
    return CurrentUser(
        user_id=str(payload["sub"]),
        roles=list(payload.get("roles", [])),
        username=payload.get("username"),
    )


def require_roles(*roles: str):
    """Dependency factory: yêu cầu user có ít nhất một trong các role."""

    def _checker(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        if roles and not user.has_role(*roles):
            raise DomainError("FORBIDDEN", "Không đủ quyền", status_code=403)
        return user

    return _checker
