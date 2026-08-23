"""JWT + băm mật khẩu dùng chung cho identity-service và verify ở các service khác."""
import datetime as dt
from typing import Any

import bcrypt
import jwt


def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode(), hashed.encode())
    except ValueError:
        return False


def create_token(
    *,
    subject: str,
    roles: list[str],
    secret: str,
    algorithm: str,
    ttl_seconds: int,
    token_type: str = "access",
    extra: dict[str, Any] | None = None,
) -> str:
    now = dt.datetime.now(tz=dt.timezone.utc)
    payload: dict[str, Any] = {
        "sub": subject,
        "roles": roles,
        "type": token_type,
        "iat": now,
        "exp": now + dt.timedelta(seconds=ttl_seconds),
        "jti": _jti(),
    }
    if extra:
        payload.update(extra)
    return jwt.encode(payload, secret, algorithm=algorithm)


def decode_token(token: str, *, secret: str, algorithm: str) -> dict[str, Any]:
    return jwt.decode(token, secret, algorithms=[algorithm])


def _jti() -> str:
    import uuid

    return uuid.uuid4().hex
