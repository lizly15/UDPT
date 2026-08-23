# Bảng truy vết yêu cầu (Requirements Traceability)

Ánh xạ từng yêu cầu của đề bài → nơi hiện thực → cách kiểm chứng. Dùng để chứng minh bao phủ 100%.

## 1. Chức năng nghiệp vụ (mục 4)
| Yêu cầu | Service | Endpoint chính | Kiểm chứng |
|---|---|---|---|
| 4.1 Quản lý khách hàng | customer | `/customers`, `PATCH /customers/{code}/status` | seed A.1, smoke |
| 4.2 Quản lý hợp đồng | contract | `/contracts`, `/submit`, `/activate`, `/cancel` | seed A.3, SC-01/05/08/09 |
| 4.3 Phụ lục hợp đồng | contract | `/contracts/{code}/appendices` | CTR-07 |
| 4.4 Bảng giá + version | pricing | `/pricing/lists`, `/versions`, `/effective` | seed A.5/A.6, SC-02/10 |
| 4.5 Sản lượng + khóa kỳ | billing | `/volumes`, `/volumes/lock` | seed A.7 |
| 4.6 Bảng thanh toán | billing | `/payments/generate`, `/submit` | seed A.8 (khớp tuyệt đối) |
| 4.7 Quy trình phê duyệt (không hard-code) | workflow | `/workflows/instances`, `/tasks/*` | data-driven definitions |
| 4.8 Ký điện tử (async) | workflow + mock-esign + billing | `/internal/esign/callback`, `/workflows/esign/*` | payment → Issued |
| 4.9 Thông báo (async) | notification | `/notifications` | seed, SC-07 |
| 4.10 Nhật ký & truy vết | notification | `/audit` | SC-07 |

## 2. Business rules & sơ đồ trạng thái (mục 5)
| Nhóm | Rule | Nơi enforce |
|---|---|---|
| Hợp đồng | CTR-01..07 | `contract-service/services/logic.py` |
| Bảng giá | PRC-01..06 | `pricing-service/services/logic.py` |
| Bảng thanh toán | PAY-01..07 | `billing-service/services/logic.py` |
| Phê duyệt & ký | APR-01..07 | `workflow-service/services/engine.py`, `esign.py` |

## 3. Kịch bản nghiệp vụ (mục A.12) — tự động kiểm thử `scripts/smoke-test.sh`
| Mã | Kịch bản | Kết quả | Trạng thái |
|---|---|---|---|
| SC-01 | Tạo HĐ chưa đính kèm | không cho Submit (`NO_ATTACHMENT`) | ✅ PASS |
| SC-02 | Hai bảng giá chồng hiệu lực | `EFFECTIVE_OVERLAP` | ✅ PASS |
| SC-03 | Thanh toán khi HĐ hết hạn | `CONTRACT_EXPIRED` | ✅ PASS |
| SC-04 | Đổi bảng giá sau phát hành | đơn giá đã copy giữ nguyên | ✅ PASS |
| SC-05 | Hai người cùng Approve | chỉ một thành công (optimistic lock) | ✅ PASS |
| SC-06 | Ký điện tử FAILED | cho gửi ký lại (`/esign/retry`) | ✅ PASS |
| SC-07 | Notification Service lỗi | nghiệp vụ chính OK + bù event khi phục hồi | ✅ PASS |
| SC-08 | Sai assignee Approve | từ chối (`NOT_ASSIGNEE`) | ✅ PASS |
| SC-09 | Submit nhiều lần | chỉ một workflow | ✅ PASS |
| SC-10 | Phụ lục 01/10 nhưng tính tháng 09 | dùng giá cũ | ✅ PASS |

→ **14/14 assertion PASS** (chạy `bash scripts/smoke-test.sh`).

## 4. Yêu cầu kỹ thuật (mục 6)
| Yêu cầu | Hiện thực |
|---|---|
| Microservices ≥4 service nghiệp vụ + API Gateway | 6 service nghiệp vụ (customer, contract, pricing, billing, workflow, notification) + identity + gateway + mock-esign |
| API Gateway (điều phối + auth cơ bản) | `api-gateway` (reverse proxy, verify JWT, rate-limit, idempotency) |
| Backend FastAPI + OpenAPI/Swagger | FastAPI mọi service, `/docs` tự sinh |
| Mỗi service DB riêng | 1 Postgres, 7 database riêng (authdb, customerdb, ...) |
| PostgreSQL | ✅ |
| Redis (cache/rate-limit/blacklist) | rate-limit + idempotency + JWT blacklist |
| Kafka/RabbitMQ ≥1 luồng async | Kafka (KRaft) + **Outbox Pattern**; toàn bộ event nghiệp vụ |
| Docker Compose (dev) | `docker-compose.yml` (`make up`) |
| Kubernetes manifests (minikube) | `k8s/` (namespace, config, infra, 9 service) |
| Logging, error handling, validation, JWT | logging JSON + request-id; error chuẩn hóa; Pydantic; JWT + RBAC |
