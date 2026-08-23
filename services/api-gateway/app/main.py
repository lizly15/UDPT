"""API Gateway: reverse proxy + verify JWT + rate limit + idempotency (Redis)."""
import json
import time

import httpx
import jwt
import redis
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware

from common.app import init_common

from .config import PUBLIC_PATHS, ROUTE_MAP, settings

app = FastAPI(title="API Gateway", version="1.0.0")
init_common(app, service_name="api-gateway", log_level=settings.log_level)

# CORS: cho phép frontend (web) gọi API. Dev: mở tất cả origin.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=False,
)

_redis = redis.Redis.from_url(settings.redis_url, decode_responses=True)
_client = httpx.AsyncClient(timeout=30.0)

HOP_BY_HOP = {"host", "content-length", "connection", "keep-alive", "transfer-encoding"}


def _json_error(status: int, code: str, message: str) -> Response:
    return Response(
        content=json.dumps({"error": {"code": code, "message": message}}, ensure_ascii=False),
        status_code=status,
        media_type="application/json",
    )


def _verify_jwt(request: Request) -> tuple[dict | None, Response | None]:
    auth = request.headers.get("authorization")
    if not auth or not auth.lower().startswith("bearer "):
        return None, _json_error(401, "UNAUTHORIZED", "Thiếu Bearer token")
    token = auth.split(" ", 1)[1]
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except jwt.ExpiredSignatureError:
        return None, _json_error(401, "TOKEN_EXPIRED", "Token hết hạn")
    except jwt.PyJWTError:
        return None, _json_error(401, "INVALID_TOKEN", "Token không hợp lệ")
    if payload.get("type") != "access":
        return None, _json_error(401, "INVALID_TOKEN", "Sai loại token")
    if _redis.exists(f"bl:{payload.get('jti')}"):
        return None, _json_error(401, "TOKEN_REVOKED", "Token đã bị thu hồi")
    return payload, None


def _rate_limited(identity: str) -> bool:
    window = int(time.time() // 60)
    key = f"rl:{identity}:{window}"
    count = _redis.incr(key)
    if count == 1:
        _redis.expire(key, 60)
    return count > settings.rate_limit_per_min


@app.api_route("/api/{full_path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
async def proxy(full_path: str, request: Request):
    segment = full_path.split("/", 1)[0]
    target_base = ROUTE_MAP.get(segment)
    if not target_base:
        return _json_error(404, "ROUTE_NOT_FOUND", f"Không có route cho /{segment}")

    is_public = full_path in PUBLIC_PATHS
    payload = None
    if not is_public:
        payload, err = _verify_jwt(request)
        if err:
            return err

    # Rate limit theo user (hoặc theo IP nếu public)
    identity = payload["sub"] if payload else (request.client.host if request.client else "anon")
    if _rate_limited(identity):
        return _json_error(429, "RATE_LIMITED", "Vượt quá giới hạn request, thử lại sau")

    body = await request.body()

    # Idempotency: chặn double-submit cho thao tác ghi
    idem_key = request.headers.get("Idempotency-Key")
    cache_key = None
    if idem_key and request.method in ("POST", "PUT", "PATCH"):
        cache_key = f"idem:{identity}:{idem_key}"
        cached = _redis.get(cache_key)
        if cached:
            data = json.loads(cached)
            return Response(
                content=data["body"],
                status_code=data["status"],
                media_type="application/json",
                headers={"X-Idempotent-Replay": "true"},
            )

    # Chuyển tiếp header người dùng + gắn thông tin đã xác thực cho service nội bộ
    fwd_headers = {k: v for k, v in request.headers.items() if k.lower() not in HOP_BY_HOP}
    if payload:
        fwd_headers["X-User-Id"] = str(payload["sub"])
        fwd_headers["X-User-Roles"] = ",".join(payload.get("roles", []))

    url = f"{target_base}/{full_path}"
    try:
        upstream = await _client.request(
            request.method, url, headers=fwd_headers, content=body,
            params=dict(request.query_params),
        )
    except httpx.RequestError as exc:
        return _json_error(502, "UPSTREAM_UNAVAILABLE", f"Service không phản hồi: {exc}")

    resp_headers = {
        k: v for k, v in upstream.headers.items() if k.lower() not in HOP_BY_HOP
    }
    if cache_key and 200 <= upstream.status_code < 300:
        _redis.set(
            cache_key,
            json.dumps({"status": upstream.status_code, "body": upstream.text}),
            ex=86400,
        )
    return Response(
        content=upstream.content,
        status_code=upstream.status_code,
        headers=resp_headers,
        media_type=upstream.headers.get("content-type"),
    )
