# KẾ HOẠCH ĐỒ ÁN — Hệ thống Quản trị Kinh doanh (UDPT)

> Môn: Ứng dụng phân tán — ĐH KHTN, Khoa CNTT
> Quy mô: **Nhóm 2–3 người** · Backend: **FastAPI (Python)** · Thiết kế: **Design spec + mockup HTML/SVG (dựng lại trên Figma)** · Deadline: **1–2 tuần**
> Toàn bộ làm trong `/Users/hahoang/Tly/UDPT/DATH`.

Tài liệu này là "bản đồ" đầy đủ: kiến trúc → thiết kế → implement → test → K8s → report. Đọc kèm 2 file đề bài (`QTKD_DATH (1).pdf`, `Data sample.pdf`).

---

## 0. Tổng quan quyết định kiến trúc (chốt)

| Hạng mục | Lựa chọn | Lý do |
|---|---|---|
| Backend | FastAPI + SQLAlchemy 2 + Alembic + Pydantic v2 | Nhanh, OpenAPI tự sinh, hợp solo/nhóm nhỏ |
| Frontend | React + Vite + TypeScript + TailwindCSS | Dựng nhanh theo mockup, chụp screenshot làm minh chứng |
| API Gateway | FastAPI gateway (httpx reverse-proxy) | Tự viết để "hiểu" gateway; verify JWT + rate limit tại đây |
| DB | **1 PostgreSQL container, mỗi service 1 database riêng** | Thỏa "DB/schema riêng", nhẹ RAM hơn nhiều container Postgres |
| Cache/Rate limit | Redis | Rate limit gateway, idempotency-key, token blacklist, cache |
| Message broker | **Kafka (KRaft)** | Nhóm đã dùng ở QuanLySinhVien; hợp Outbox Pattern |
| Async pattern | **Outbox Pattern** + Kafka consumer | Chống mất event (yêu cầu ở mục 5.5) |
| Auth | JWT (access + refresh), RBAC theo role phòng ban | Yêu cầu bắt buộc |
| Approval | **Workflow-service cấu hình bằng dữ liệu** (bảng định nghĩa step) | Thỏa APR: "không hard-code if/else" |
| E-sign | **Mock E-Sign provider** (async webhook/callback) | Đề cho phép mô phỏng; trọng tâm là trạng thái + bất đồng bộ |
| Deploy | Docker Compose (dev) + K8s manifests (minikube) | Yêu cầu bắt buộc |
| Report | Markdown → PDF (pandoc), trang bìa HCMUS, sơ đồ Mermaid/ASCII | Theo phong cách report BTTH1/BT1 của nhóm |

---

## 1. Kiến trúc hệ thống

### 1.1 Danh sách service (6 nghiệp vụ + gateway)

| # | Service | Trách nhiệm (map đề bài) | DB | Port |
|---|---|---|---|---|
| 1 | **api-gateway** | Reverse proxy, verify JWT, rate limit (Redis), CORS | — | 8080 |
| 2 | **identity-service** | User, role, login, JWT issue/refresh, blacklist (mục phân quyền, JWT) | `authdb` | 8001 |
| 3 | **customer-service** | Khách hàng (4.1) + Danh mục dịch vụ (A.2) | `customerdb` | 8002 |
| 4 | **contract-service** | Hợp đồng (4.2) + Phụ lục (4.3), state machine CTR-01..07 | `contractdb` | 8003 |
| 5 | **pricing-service** | Bảng giá + version (4.4), PRC-01..06 | `pricingdb` | 8004 |
| 6 | **billing-service** | Sản lượng (4.5) + Bảng thanh toán (4.6) PAY-01..07 + phiên ký (nhận callback e-sign) | `billingdb` | 8005 |
| 7 | **workflow-service** | Engine phê duyệt cấu hình (4.7, APR-01..07) + điều phối e-sign | `workflowdb` | 8006 |
| 8 | **notification-service** | Thông báo (4.9) + Audit log (4.10), consume mọi event | `notifdb` | 8007 |
| — | **mock-esign** | Nhà cung cấp ký điện tử giả lập, callback bất đồng bộ | — | 8009 |

> "Service nghiệp vụ ngoài Gateway" = customer, contract, pricing, billing, workflow, notification → **6 service** (yêu cầu tối thiểu 4). Identity là hạ tầng auth; mock-esign là bên thứ ba giả lập.

### 1.2 Sơ đồ kiến trúc (rút gọn)

```
                         ┌───────────────┐
        Browser ───────► │  React SPA    │
                         └──────┬────────┘
                                │ HTTPS + JWT
                         ┌──────▼────────┐   verify JWT, rate-limit (Redis)
                         │  API Gateway  │
                         └──┬───┬───┬────┘
        ┌──────────┬───────┘   │   └────────┬───────────┐
        ▼          ▼           ▼            ▼           ▼
   identity    customer     contract     pricing     billing
        │          │           │            │           │
        └──────────┴─────┬─────┴─────┬──────┴─────┬─────┘
                         │  (Outbox) │            │ (Outbox)
                         ▼           ▼            ▼
                     ┌───────────────────────────────┐
                     │            Kafka               │
                     └───┬───────────────┬───────────┘
                         ▼               ▼
                   workflow-svc    notification-svc
                         │           (notif + audit)
                         ▼
                    mock-esign  ──callback──► billing
```

Chi tiết luồng, topic Kafka, và các sequence diagram sẽ nằm trong `docs/architecture.md`.

### 1.3 Topic Kafka & sự kiện chính

| Topic | Producer | Consumer | Payload |
|---|---|---|---|
| `contract.events` | contract | workflow, notification | ContractSubmitted, ContractApproved... |
| `pricing.events` | pricing | workflow, notification | PriceListSubmitted... |
| `billing.events` | billing | workflow, notification | PaymentSubmitted, PaymentIssued |
| `workflow.events` | workflow | contract/pricing/billing, notification | StepAssigned, DocApproved, DocRejected |
| `esign.events` | workflow/mock-esign | billing, notification | SigningRequested, Signed, SignFailed |

---

## 2. Mô hình dữ liệu (rút gọn — chi tiết trong `docs/data-model.md` + ERD)

- **identity**: `users`, `roles`, `user_roles`, `refresh_tokens`.
- **customer**: `customers`, `services` (danh mục dịch vụ).
- **contract**: `contracts`, `contract_appendices`, `contract_attachments`, `outbox`.
- **pricing**: `price_lists`, `price_list_versions`, `price_items`, `outbox`.
- **billing**: `volume_records`, `payment_statements`, `payment_lines`, `signing_sessions`, `outbox`.
- **workflow**: `workflow_definitions`, `workflow_steps` (định nghĩa), `workflow_instances`, `workflow_tasks` (bước hiện tại + assignee), `outbox`.
- **notification**: `notifications`, `audit_logs`.

Mọi bảng "lưu giá tại thời điểm tính" (PAY-03): `payment_lines` copy `unit_price` cứng, không FK động sang pricing.

Seed đúng bằng `Data sample.pdf` (5 KH, 6 DV, 3 HĐ, 2 version bảng giá, sản lượng T08, bảng thanh toán T08) để demo + test khớp đề.

---

## 3. Bản đồ Yêu cầu → Nơi thực hiện (checklist bao phủ 100%)

| Yêu cầu đề bài | Thực hiện ở đâu | Business rule liên quan |
|---|---|---|
| 4.1 Quản lý khách hàng | customer-service | — |
| 4.2 Quản lý hợp đồng | contract-service | CTR-01..07 |
| 4.3 Phụ lục hợp đồng | contract-service | CTR-07 |
| 4.4 Bảng giá + version | pricing-service | PRC-01..06 |
| 4.5 Sản lượng + khóa kỳ | billing-service | — |
| 4.6 Bảng thanh toán | billing-service | PAY-01..07 |
| 4.7 Quy trình phê duyệt (không hard-code) | workflow-service (data-driven) | APR-01..05 |
| 4.8 Ký điện tử (async, trạng thái) | workflow + mock-esign + billing | APR-06/07, PAY-06/07 |
| 4.9 Thông báo (async event) | notification-service | — |
| 4.10 Nhật ký & truy vết | notification-service (audit_logs) | — |
| Double submit (SC-09) | Idempotency-Key (Redis) + unique constraint | 5.5 |
| Race condition duyệt (SC-05) | Optimistic locking (version col) trong workflow | 5.5 |
| Event bị mất | Outbox Pattern + Kafka retry | 5.5 |
| Phân quyền theo ngữ cảnh (SC-08) | workflow kiểm tra assignee, không chỉ role (APR-01) | 5.5 |
| Dữ liệu lịch sử (SC-04, SC-10) | copy đơn giá vào payment_line; chọn version theo ngày | PAY-03 |
| Microservices ≥4 + Gateway | 6 service nghiệp vụ + gateway | Mục 6 |
| PostgreSQL / Redis / Kafka | có đủ | Mục 6 |
| Docker Compose | `docker-compose.yml` | Mục 6 |
| Kubernetes manifests | `k8s/` (minikube) | Mục 6 |
| OpenAPI/Swagger | FastAPI `/docs` mỗi service | Mục 6 |
| JWT + logging + validation | identity + gateway + Pydantic | Mục 6 |

→ Sẽ có file `docs/requirements-traceability.md` liệt kê từng SC-01..SC-10 với endpoint/test tương ứng để hội đồng thấy rõ đã cover.

---

## 4. Cấu trúc thư mục dự án

```
DATH/
├── README.md                      # cách chạy, kiến trúc tóm tắt
├── PLAN.md                        # (file này)
├── docker-compose.yml             # chạy toàn hệ thống dev
├── .env.example
├── Makefile                       # up/down/seed/test/report shortcut
│
├── design/                        # === THIẾT KẾ (giao cho Figma) ===
│   ├── design-system.md           # màu, typography, spacing, component
│   ├── mockups/                   # 1 file HTML/SVG mỗi màn hình
│   │   ├── 00-login.html
│   │   ├── 01-dashboard.html
│   │   ├── 02-customers.html
│   │   ├── 03-contract-detail.html
│   │   ├── 04-pricing.html
│   │   ├── 05-billing.html
│   │   ├── 06-approval-inbox.html
│   │   └── 07-notifications-audit.html
│   └── flows.md                   # user flow map cho Figma prototype
│
├── services/
│   ├── _shared/                   # lib chung: jwt, kafka, outbox, logging, errors
│   ├── api-gateway/
│   ├── identity-service/
│   ├── customer-service/
│   ├── contract-service/
│   ├── pricing-service/
│   ├── billing-service/
│   ├── workflow-service/
│   ├── notification-service/
│   └── mock-esign/
│       └── (mỗi service: app/, alembic/, tests/, Dockerfile, requirements.txt)
│
├── frontend/                      # React + Vite + TS
│
├── k8s/                           # manifests minikube
│   ├── namespace.yaml, configmap, secret
│   ├── postgres.yaml, redis.yaml, kafka.yaml
│   └── <service>-deployment.yaml + service.yaml + ingress.yaml
│
├── docs/
│   ├── architecture.md            # sơ đồ + sequence diagram (Mermaid)
│   ├── data-model.md + erd.mmd/erd.png
│   ├── api.md                     # tổng hợp endpoint
│   ├── requirements-traceability.md
│   └── business-rules.md          # CTR/PRC/PAY/APR + cách enforce
│
├── scripts/
│   ├── seed.py                    # nạp Data sample.pdf
│   └── smoke-test.sh              # test end-to-end SC-01..SC-10
│
└── report/
    ├── report.md
    ├── cover.md / logo_hcmus.jpg
    ├── screenshots/
    └── BaoCao_<MSSV>.pdf
```

Mỗi FastAPI service theo layout chuẩn:
```
app/
├── main.py            # FastAPI app, router, middleware
├── config.py          # pydantic-settings
├── database.py        # engine, session
├── models.py          # SQLAlchemy
├── schemas.py         # Pydantic
├── routers/           # endpoints
├── services/          # business logic + state machine
├── events/            # outbox publisher + kafka consumer
└── deps.py            # auth dependency (verify JWT)
```

---

## 5. Kế hoạch thực hiện theo phase (1–2 tuần, nhóm 2–3)

Chia **3 track** để làm song song. Ký hiệu người: **A** (backend core/infra), **B** (backend nghiệp vụ), **C** (frontend + design + report). Nhóm 2 người thì gộp B+C luân phiên.

### Phase 0 — Nền tảng (Ngày 1) · toàn nhóm
- [ ] Khởi tạo repo, cấu trúc thư mục, `_shared` lib (jwt util, kafka producer/consumer, outbox helper, logging, error handler).
- [ ] `docker-compose.yml`: postgres (multi-db init script), redis, kafka, kafka-ui.
- [ ] Chuẩn Dockerfile mẫu + template FastAPI service (health `/healthz`, `/docs`).
- [ ] Chốt `docs/architecture.md` + `docs/data-model.md` (ERD) trước khi code.

### Phase 1 — Auth + Gateway + Design (Ngày 2–3)
- [ ] **A**: identity-service (register/login/refresh, RBAC, blacklist Redis) + api-gateway (proxy, verify JWT, rate limit, idempotency middleware).
- [ ] **C**: `design/design-system.md` + 8 mockup HTML/SVG + `flows.md` (giao cho Figma). Khởi tạo frontend React skeleton + auth flow + layout.

### Phase 2 — Domain services (Ngày 4–7)
- [ ] **B**: customer-service (CRUD KH + danh mục DV) → contract-service (hợp đồng + phụ lục + state machine CTR) → pricing-service (bảng giá + version + PRC-03 chống chồng hiệu lực).
- [ ] **A**: workflow-service (definition data-driven, instance, task, assignee check APR-01, optimistic lock SC-05) + notification-service (consumer, notifications, audit log).
- [ ] **C**: frontend các màn Customers, Contracts (list/detail/create + approval timeline), Pricing.

### Phase 3 — Billing + E-sign + Async wiring (Ngày 8–10)
- [ ] **B**: billing-service (sản lượng, khóa kỳ, sinh bảng thanh toán từ HĐ + bảng giá hiệu lực + sản lượng, PAY-03 copy đơn giá).
- [ ] **A**: mock-esign + luồng ký (workflow gửi request → callback async → billing set Signed/Issued, esign.events), Outbox relay chạy ổn.
- [ ] **C**: frontend Billing, Approval Inbox, Notifications, Audit viewer, Admin (users + workflow config).

### Phase 4 — Tích hợp, test, K8s (Ngày 11–12)
- [ ] `scripts/seed.py` nạp đúng Data sample; `scripts/smoke-test.sh` chạy SC-01..SC-10.
- [ ] Unit test (pytest) cho state machine + business rules trọng yếu; integration test luồng duyệt→ký.
- [ ] `k8s/` manifests + chạy thử trên minikube; chụp screenshot.

### Phase 5 — Report + đóng gói (Ngày 13–14)
- [ ] Viết `report/report.md` (theo mục 7), render PDF, chụp screenshot minh chứng.
- [ ] `README.md` hướng dẫn chạy; đóng gói `MSSV_HoTen.zip`.
- [ ] Rà `requirements-traceability.md` đảm bảo 100% yêu cầu có minh chứng.

---

## 6. Xử lý các điểm "khó" (để không mất điểm nâng cao)

1. **Approval không hard-code**: `workflow_definitions` → `workflow_steps(order, role, assignee_rule)`. Service nghiệp vụ khi submit gọi workflow tạo instance theo `doc_type`. Engine đọc DB để quyết định bước kế, không viết if/else theo loại hồ sơ.
2. **Double submit (SC-09)**: client gửi `Idempotency-Key`; gateway/service lưu key vào Redis (TTL) + unique constraint `(doc_id, action)` → lần 2 trả kết quả cũ, không tạo workflow mới.
3. **Race condition duyệt (SC-05)**: cột `version` trên `workflow_tasks`; `UPDATE ... WHERE version=?`; hai approve đồng thời → chỉ 1 thành công, cái còn lại nhận 409.
4. **Event bị mất**: **Outbox** — ghi domain + row outbox trong 1 transaction; relay poll outbox → publish Kafka → đánh dấu sent. Consumer idempotent.
5. **Phân quyền theo ngữ cảnh (SC-08, APR-01)**: kiểm tra `task.assignee == current_user` (hoặc thuộc nhóm được giao), không chỉ kiểm role.
6. **Dữ liệu lịch sử (SC-04/SC-10, PAY-03)**: chọn bảng giá theo `effective_date <= kỳ tính`; copy `unit_price` vào `payment_line`; đổi bảng giá sau đó không ảnh hưởng bảng đã phát hành.
7. **E-sign async (APR-06/07)**: trạng thái phiên ký tách biệt trạng thái duyệt; retry khi callback lỗi; billing chỉ set Issued khi nhận `esign.signed`.

---

## 7. Cấu trúc Report (theo phong cách nhóm đã có)

1. Trang bìa HCMUS + thông tin nhóm/GV.
2. Giới thiệu bài toán & phạm vi.
3. Kiến trúc tổng thể (sơ đồ, danh sách service, port, công nghệ).
4. Thiết kế dữ liệu (ERD, giải thích DB-per-service).
5. Thiết kế giao diện (design system + mockup Figma).
6. Chi tiết từng service & API (kèm Swagger).
7. Luồng nghiệp vụ trọng tâm (sequence: submit→duyệt→ký→phát hành).
8. Xử lý vấn đề phân tán (Outbox, idempotency, locking, RBAC ngữ cảnh) — **phần ăn điểm**.
9. Triển khai (Docker Compose + Kubernetes) kèm screenshot.
10. Bảng truy vết yêu cầu (SC-01..SC-10) + minh chứng.
11. Phân công công việc + kết luận.

---

## 8. Rủi ro & cách giảm

| Rủi ro | Giảm thiểu |
|---|---|
| Máy yếu RAM (nhiều container) | 1 Postgres nhiều DB; Kafka single-broker KRaft; bật service theo profile |
| Kafka khó ổn định trên máy cá nhân | Có sẵn compose test; fallback consumer retry; kafka-ui để debug |
| K8s tốn thời gian | Làm compose trước; K8s chỉ cần deploy được + screenshot; tái dùng image từ compose |
| Scope phình | Bám checklist mục 3; không thêm tính năng ngoài đề |
| Xuất PDF | Cài pandoc (hoặc dùng trình md→pdf); mẫu bìa lấy từ BT1/BTTH1 |
