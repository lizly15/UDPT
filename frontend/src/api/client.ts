// API client dùng chung: tự gắn JWT, tự refresh khi 401, chuẩn hóa lỗi.
const BASE = import.meta.env.VITE_API_BASE || "http://localhost:8080/api";

export class ApiError extends Error {
  code: string;
  details: unknown;
  status: number;
  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function getToken() {
  return localStorage.getItem("access_token");
}
function getRefresh() {
  return localStorage.getItem("refresh_token");
}
export function setTokens(access: string, refresh: string) {
  localStorage.setItem("access_token", access);
  localStorage.setItem("refresh_token", refresh);
}
export function clearTokens() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
}

async function refreshToken(): Promise<boolean> {
  const rt = getRefresh();
  if (!rt) return false;
  const res = await fetch(`${BASE}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: rt }),
  });
  if (!res.ok) return false;
  const data = await res.json();
  setTokens(data.access_token, data.refresh_token);
  return true;
}

interface Options {
  method?: string;
  body?: unknown;
  idempotencyKey?: string;
  _retry?: boolean;
}

export async function request<T = any>(path: string, opts: Options = {}): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (opts.idempotencyKey) headers["Idempotency-Key"] = opts.idempotencyKey;

  const res = await fetch(`${BASE}${path}`, {
    method: opts.method || "GET",
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });

  // Tự refresh 1 lần khi 401
  if (res.status === 401 && !opts._retry) {
    if (await refreshToken()) {
      return request<T>(path, { ...opts, _retry: true });
    }
    clearTokens();
    window.location.href = "/login";
    throw new ApiError(401, "UNAUTHORIZED", "Phiên đăng nhập hết hạn");
  }

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const err = data?.error || {};
    throw new ApiError(res.status, err.code || "ERROR", err.message || "Có lỗi xảy ra", err.details);
  }
  return data as T;
}

// Lấy message lỗi thân thiện từ mọi loại error.
export function errMsg(e: unknown): string {
  if (e instanceof ApiError) return e.message;
  return e instanceof Error ? e.message : "Có lỗi xảy ra";
}

export const api = {
  get: <T = any>(p: string) => request<T>(p),
  post: <T = any>(p: string, body?: unknown, idempotencyKey?: string) =>
    request<T>(p, { method: "POST", body, idempotencyKey }),
  put: <T = any>(p: string, body?: unknown) => request<T>(p, { method: "PUT", body }),
  patch: <T = any>(p: string, body?: unknown) => request<T>(p, { method: "PATCH", body }),
};
