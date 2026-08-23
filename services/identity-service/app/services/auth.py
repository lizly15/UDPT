"""Nghiệp vụ xác thực: đăng nhập, cấp/refresh token, đăng xuất (blacklist qua Redis)."""
import redis
from sqlalchemy import select
from sqlalchemy.orm import Session

from common.config import get_base_settings
from common.errors import DomainError
from common.security import create_token, decode_token, verify_password

from ..models import User

settings = get_base_settings()
_redis = redis.Redis.from_url(settings.redis_url, decode_responses=True)


def _blacklist_key(jti: str) -> str:
    return f"bl:{jti}"


def is_blacklisted(jti: str) -> bool:
    return _redis.exists(_blacklist_key(jti)) == 1


def blacklist(jti: str, ttl_seconds: int) -> None:
    _redis.set(_blacklist_key(jti), "1", ex=max(ttl_seconds, 1))


def authenticate(db: Session, username: str, password: str) -> User:
    user = db.execute(select(User).where(User.username == username)).scalar_one_or_none()
    if not user or not verify_password(password, user.password_hash):
        raise DomainError("INVALID_CREDENTIALS", "Sai tài khoản hoặc mật khẩu", status_code=401)
    if not user.is_active:
        raise DomainError("USER_INACTIVE", "Tài khoản đã bị tạm ngưng", status_code=403)
    return user


def issue_tokens(user: User) -> dict:
    access = create_token(
        subject=user.id,
        roles=user.role_codes,
        secret=settings.jwt_secret,
        algorithm=settings.jwt_algorithm,
        ttl_seconds=settings.access_token_ttl_min * 60,
        token_type="access",
        extra={"username": user.username},
    )
    refresh = create_token(
        subject=user.id,
        roles=user.role_codes,
        secret=settings.jwt_secret,
        algorithm=settings.jwt_algorithm,
        ttl_seconds=settings.refresh_token_ttl_days * 86400,
        token_type="refresh",
    )
    return {
        "access_token": access,
        "refresh_token": refresh,
        "roles": user.role_codes,
        "user_id": user.id,
        "full_name": user.full_name,
    }


def refresh_tokens(db: Session, refresh_token: str) -> dict:
    try:
        payload = decode_token(
            refresh_token, secret=settings.jwt_secret, algorithm=settings.jwt_algorithm
        )
    except Exception:  # noqa: BLE001
        raise DomainError("INVALID_TOKEN", "Refresh token không hợp lệ", status_code=401)
    if payload.get("type") != "refresh":
        raise DomainError("INVALID_TOKEN", "Sai loại token", status_code=401)
    if is_blacklisted(payload["jti"]):
        raise DomainError("TOKEN_REVOKED", "Token đã bị thu hồi", status_code=401)
    user = db.get(User, payload["sub"])
    if not user or not user.is_active:
        raise DomainError("USER_INACTIVE", "Người dùng không hợp lệ", status_code=403)
    return issue_tokens(user)


def logout(access_token: str) -> None:
    """Blacklist access token còn lại theo thời gian sống còn của nó."""
    import datetime as dt

    try:
        payload = decode_token(
            access_token, secret=settings.jwt_secret, algorithm=settings.jwt_algorithm
        )
    except Exception:  # noqa: BLE001
        return
    exp = payload.get("exp", 0)
    ttl = int(exp - dt.datetime.now(tz=dt.timezone.utc).timestamp())
    blacklist(payload["jti"], ttl)
