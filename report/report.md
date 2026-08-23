---
title: "ĐỒ ÁN THỰC HÀNH — MÔN ỨNG DỤNG PHÂN TÁN"
subtitle: "Đề tài: Hệ thống Quản trị Kinh doanh (Microservices)"
---

<div style="text-align:center">

# ĐỒ ÁN THỰC HÀNH — ỨNG DỤNG PHÂN TÁN
## Đề tài: HỆ THỐNG QUẢN TRỊ KINH DOANH

**Trường Đại học Khoa học Tự nhiên – ĐHQG TP.HCM · Khoa Công nghệ Thông tin**
**Giảng viên:** Nguyễn Trường Sơn · Phạm Minh Tú

| MSSV | Họ tên | Phụ trách |
|---|---|---|
| 21126027 | Nguyễn Tuấn Kiệt | Backend nền tảng: Gateway, Identity, Workflow, Kafka/Outbox, K8s |
| 21126057 | Nguyễn Hoàng Danh | Backend nghiệp vụ: Customer, Contract, Pricing, Billing, mock-esign, seed/test |
| 21126028 | Vũ Huyền Thiên Lý | Frontend (shell, auth, Customers/Contracts/Pricing) + Design + Report |
| 22127247 | Nguyễn Thế Thanh Long | Frontend (Approval, Notifications, Volumes, Payments, Audit, Admin) |

</div>

<div style="page-break-after:always"></div>

## 1. Giới thiệu & phạm vi

Công ty logistics ABC cần một hệ thống tập trung quản lý **vòng đời hồ sơ kinh doanh**: khách hàng → hợp đồng → phụ lục → bảng giá → sản lượng → bảng thanh toán → phê duyệt → **ký điện tử**, kèm **thông báo bất đồng bộ** và **nhật ký truy vết**. Hệ thống thay thế quy trình thủ công (email/Excel) vốn phân tán, khó kiểm soát trạng thái và truy vết.

Đồ án hiện thực theo **kiến trúc microservices** với đầy đủ yêu cầu kỹ thuật: API Gateway, ≥4 service nghiệp vụ, PostgreSQL (DB riêng mỗi service), Redis, Kafka, Docker Compose, Kubernetes, JWT, OpenAPI.

## 2. Kiến trúc tổng thể

Hệ thống gồm **9 service** (6 nghiệp vụ + identity + gateway + mock-esign) chạy độc lập:

| Service | Port | Database | Vai trò |
|---|---|---|---|
| api-gateway | 8080 | — | Reverse proxy, verify JWT, rate-limit, idempotency |
| identity-service | 8001 | authdb | User, role, JWT (access/refresh), blacklist |
| customer-service | 8002 | customerdb | Khách hàng + danh mục dịch vụ |
| contract-service | 8003 | contractdb | Hợp đồng + phụ lục (CTR-01..07) |
| pricing-service | 8004 | pricingdb | Bảng giá + version (PRC-01..06) |
| billing-service | 8005 | billingdb | Sản lượng + bảng thanh toán (PAY-01..07) |
| workflow-service | 8006 | workflowdb | Engine phê duyệt data-driven + điều phối ký điện tử (APR) |
| notification-service | 8007 | notifdb | Thông báo + audit log |
| mock-esign | 8009 | — | Nhà cung cấp ký điện tử giả lập (async callback) |

```
   Browser/Swagger ──JWT──> API Gateway :8080 ──> [identity|customer|contract|
                                 │  (verify JWT,      pricing|billing|workflow|
                                 │   rate-limit,      notification]
                                 │   idempotency)          │
                                 └── Redis                 │ Outbox
   contract/pricing/billing ──REST submit──> workflow      ▼
   billing ──REST(giá,HĐ)──> contract,pricing           Kafka ──> workflow,
   workflow ──HTTP──> mock-esign ──callback──> workflow  notification, billing,
   Mỗi service ─── PostgreSQL (7 DB riêng)               contract, pricing
```

**Nguyên tắc giao tiếp:** đồng bộ (REST) cho lệnh tức thời; **bất đồng bộ (Kafka + Outbox)** cho lan truyền sự kiện (kết quả duyệt, ký, thông báo, audit). Xem sơ đồ chi tiết & sequence tại `docs/architecture.md`.

## 3. Công nghệ sử dụng
- **Backend:** FastAPI + SQLAlchemy 2 + Pydantic v2 (Python 3.12); OpenAPI/Swagger tự sinh.
- **CSDL:** PostgreSQL 16 — 1 cụm, **mỗi service 1 database riêng**.
- **Bất đồng bộ:** Apache Kafka (KRaft) + **Outbox Pattern** (confluent-kafka).
- **Cache/Điều tiết:** Redis (rate-limit, idempotency-key, JWT blacklist).
- **Xác thực:** JWT (access + refresh) + RBAC 7 role.
- **Frontend:** React + Vite + TypeScript + TailwindCSS (khung + API client dùng chung).
- **Hạ tầng:** Docker Compose (dev) + Kubernetes manifests (minikube).

## 4. Thiết kế dữ liệu

Áp dụng **Database-per-Service**: cô lập dữ liệu, không FK xuyên service (liên kết bằng mã nghiệp vụ). Các bảng chính và ERD xem `docs/data-model.md`. Điểm quan trọng: `payment_lines.unit_price` được **copy cứng** tại thời điểm tính phí (PAY-03) để bảng thanh toán không đổi khi bảng giá thay đổi về sau.

## 5. Thiết kế giao diện

Bộ **design system** (màu, typography, badge trạng thái, component chuẩn) tại `design/design-system.md`, dùng để dựng Figma và thống nhất UI. Frontend hiện thực bằng React theo khung mẫu ở `frontend/` (đã có API client tự refresh token, Auth, Layout, các màn Login/Dashboard/Customers; các màn còn lại theo `docs/frontend-handover.md`). *(Chèn screenshot các màn tại `report/screenshots/`.)*

## 6. Chi tiết service & API

Mỗi service tự sinh Swagger tại `/docs`. Danh sách endpoint đầy đủ + quy ước (auth, lỗi chuẩn hóa, idempotency, roles) xem `docs/api.md`. Tóm tắt luồng:
1. Đăng nhập → nhận JWT → gọi API qua Gateway `/api/*`.
2. Kinh doanh: tạo Customer → Contract → submit → theo dõi timeline duyệt.
3. Người duyệt: xem `/tasks/inbox` → approve/reject.
4. Khai thác: nhập sản lượng → khóa kỳ.
5. Kế toán: lập bảng thanh toán → submit → duyệt → hệ thống tự ký → Issued.

## 7. Luồng nghiệp vụ trọng tâm

**Duyệt hợp đồng (4 cấp):**
```
Sales submit ─> contract tạo workflow (REST) ─> workflow gán bước 1
  ─> [manager01 → legal01 → account01 → director01] approve
  ─> bước cuối: workflow phát DocApproved (Outbox→Kafka)
  ─> contract consume → status=Approved ─> Sales activate → Active
  (song song) notification: thông báo + ghi audit từng bước
```

**Bảng thanh toán + ký điện tử (bất đồng bộ):**
```
Kế toán generate (billing gọi contract kiểm hiệu lực + pricing lấy giá, copy giá)
  ─> submit ─> duyệt [account01 → director01]
  ─> workflow: DocApproved + tự start_signing ─> mock-esign (async)
  ─> callback signed ─> esign.events:Signed ─> billing status=Issued
```
Sequence chi tiết: `docs/architecture.md` mục 4–5.

## 8. Xử lý bài toán phân tán (điểm nhấn kỹ thuật)

| Vấn đề | Giải pháp | Vị trí |
|---|---|---|
| **Quy trình duyệt không hard-code** | Engine đọc định nghĩa quy trình từ DB (`workflow_definitions/step_defs`) | `workflow-service/services/engine.py` |
| **Double submit** (SC-09) | `Idempotency-Key` (Redis, gateway) + instance duy nhất đang mở | `api-gateway`, `engine.create_instance` |
| **Race condition khi duyệt** (SC-05) | Optimistic locking `version_id` → `StaleDataError` → HTTP 409 | `WorkflowInstance` |
| **Mất event** | **Outbox Pattern**: ghi DB + outbox cùng transaction, relay publish Kafka | `common/outbox.py` |
| **Phân quyền theo ngữ cảnh** (SC-08) | Kiểm tra đúng **assignee** ở bước hiện tại, không chỉ role | `engine.act` |
| **Dữ liệu lịch sử** (SC-04/10) | Chọn bảng giá theo ngày + copy đơn giá cứng | `pricing`, `billing` |
| **Service phụ lỗi** (SC-07) | Async + Outbox: nghiệp vụ chính không hỏng, bù event khi phục hồi | Kafka + consumer idempotent |

Chi tiết mapping rule ↔ code: `docs/business-rules.md`.

## 9. Triển khai & cách chạy

**Docker Compose (dev):**
```bash
cp .env.example .env
make up                      # build & chạy 13 container
python3 scripts/seed.py      # nạp dữ liệu mẫu A.1–A.8
```
Gateway: `:8080` · Swagger: `:8001..:8007/docs` · Kafka UI: `:8085`.

**Kubernetes (minikube):** manifests tại `k8s/` (namespace, config, hạ tầng, 9 service). Xem `k8s/README.md`.

## 10. Kiểm thử & minh chứng

- **Seed tái tạo chính xác bộ dữ liệu mẫu**: bảng thanh toán tháng 08/2026 = **50.500.000đ** với 5 dòng khớp tuyệt đối Phụ lục A.8 (Container20 7tr, Container40 5.5tr, Lưu kho 21tr, Vận chuyển 15tr, Kiểm đếm 2tr), trạng thái cuối **Issued** (đã ký điện tử).
- **Smoke test kịch bản nghiệp vụ**: `bash scripts/smoke-test.sh` → **14/14 assertion PASS** cho SC-01..SC-10.

| SC | Kết quả kiểm thử |
|---|---|
| 01 | Chặn submit thiếu đính kèm ✅ |
| 02 | Chặn chồng hiệu lực bảng giá ✅ |
| 03 | Chặn thanh toán HĐ hết hạn ✅ |
| 04 | Đơn giá đã copy giữ nguyên ✅ |
| 05 | Chỉ một Approve thành công ✅ |
| 06 | Cho gửi ký lại ✅ |
| 07 | Notif lỗi, nghiệp vụ chính OK + bù event ✅ |
| 08 | Sai assignee bị chặn ✅ |
| 09 | Submit nhiều lần → một workflow ✅ |
| 10 | Tính tháng cũ dùng giá cũ ✅ |

*(Chèn screenshot: Swagger, Kafka UI, kết quả seed, kết quả smoke-test, các màn giao diện.)*

## 11. Bảng truy vết yêu cầu
Toàn bộ yêu cầu mục 4, 5, 6 và kịch bản A.12 được ánh xạ chi tiết trong `docs/requirements-traceability.md` — đảm bảo bao phủ 100%.

## 12. Phân công công việc
Xem bảng ở trang bìa. Backend chia 2 track (nền tảng / nghiệp vụ); Frontend chia 2 người theo cụm màn hình (`docs/frontend-handover.md`); Report & tích hợp: cả nhóm.

## 13. Kết luận & hướng phát triển
Hệ thống đã hiện thực đầy đủ nghiệp vụ quản trị kinh doanh trên kiến trúc microservices, giải quyết trọn vẹn các bài toán phân tán trọng tâm (workflow cấu hình, Outbox, idempotency, optimistic locking, phân quyền ngữ cảnh, ký điện tử bất đồng bộ) và kiểm chứng bằng bộ test tự động.
**Hướng phát triển:** thay Outbox relay bằng CDC (Debezium), thêm distributed tracing (OpenTelemetry), HPA/PVC trên K8s, và hoàn thiện giao diện web đầy đủ.
