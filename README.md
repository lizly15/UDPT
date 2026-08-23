# Hệ thống Quản trị Kinh doanh — Đồ án UDPT

Hệ thống microservices quản lý vòng đời hồ sơ kinh doanh của một doanh nghiệp logistics:
khách hàng → hợp đồng → phụ lục → bảng giá → sản lượng → bảng thanh toán → phê duyệt → ký điện tử,
kèm thông báo bất đồng bộ và nhật ký truy vết.

> Xem `PLAN.md` để biết kế hoạch chi tiết và `docs/` để biết kiến trúc, mô hình dữ liệu, bảng truy vết yêu cầu.

## Công nghệ
- **Backend:** FastAPI + SQLAlchemy 2 + PostgreSQL (mỗi service 1 DB riêng)
- **Async:** Kafka (KRaft) + Outbox Pattern
- **Cache/Rate-limit/Idempotency:** Redis
- **Auth:** JWT (access + refresh), RBAC theo role phòng ban
- **Frontend:** React + Vite + TypeScript + Tailwind
- **Hạ tầng:** Docker Compose (dev) + Kubernetes manifests (minikube)

## Kiến trúc (tóm tắt)
| Service | Port | DB | Vai trò |
|---|---|---|---|
| api-gateway | 8080 | — | Reverse proxy, verify JWT, rate-limit, idempotency |
| identity-service | 8001 | authdb | User, role, JWT |
| customer-service | 8002 | customerdb | Khách hàng + danh mục dịch vụ |
| contract-service | 8003 | contractdb | Hợp đồng + phụ lục (CTR) |
| pricing-service | 8004 | pricingdb | Bảng giá + version (PRC) |
| billing-service | 8005 | billingdb | Sản lượng + bảng thanh toán (PAY) + phiên ký |
| workflow-service | 8006 | workflowdb | Engine phê duyệt cấu hình (APR) + điều phối e-sign |
| notification-service | 8007 | notifdb | Thông báo + audit log |
| mock-esign | 8009 | — | Nhà cung cấp ký điện tử giả lập (async callback) |

## Chạy nhanh (Docker Compose)
```bash
cp .env.example .env
make up          # build & chạy toàn bộ
make ps          # kiểm tra trạng thái
```
- API Gateway: http://localhost:8080
- Swagger mỗi service: http://localhost:<port>/docs
- Kafka UI: http://localhost:8085

```bash
make seed        # nạp dữ liệu mẫu (sau khi hệ thống UP)
make smoke       # chạy kịch bản SC-01..SC-10
make logs SVC=contract-service
make down        # dừng   |   make clean = dừng + xóa dữ liệu
```

## Kubernetes (minikube)
Xem `k8s/README.md` (sẽ bổ sung ở Phase 4).

## Cấu trúc thư mục
Xem `PLAN.md` mục 4.
