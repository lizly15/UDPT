# Kiến trúc hệ thống

## 1. Sơ đồ thành phần
```mermaid
flowchart TB
  UI[Web Client / Swagger] -->|JWT| GW[API Gateway :8080<br/>verify JWT · rate-limit · idempotency]
  GW --> ID[identity :8001]
  GW --> CUS[customer :8002]
  GW --> CON[contract :8003]
  GW --> PRI[pricing :8004]
  GW --> BIL[billing :8005]
  GW --> WF[workflow :8006]
  GW --> NOT[notification :8007]

  CON -. REST submit .-> WF
  PRI -. REST submit .-> WF
  BIL -. REST submit .-> WF
  BIL -. REST giá/HĐ .-> CON & PRI
  WF -. HTTP .-> ES[mock-esign :8009]
  ES -. callback .-> WF

  CON & PRI & BIL & WF -->|Outbox| K((Kafka))
  K --> WF & NOT & BIL & CON & PRI

  ID --- PG[(PostgreSQL<br/>7 DB riêng)]
  CUS --- PG
  CON --- PG
  PRI --- PG
  BIL --- PG
  WF --- PG
  NOT --- PG
  GW --- R[(Redis)]
  ID --- R
```

## 2. Kênh giao tiếp
- **Đồng bộ (REST)**: UI→Gateway→service; service→workflow khi submit; billing→contract/pricing khi lập bảng thanh toán.
- **Bất đồng bộ (Kafka + Outbox)**: mọi thay đổi trạng thái phát event → notification (thông báo + audit), và propagate kết quả duyệt/ký về service sở hữu hồ sơ.

## 3. Topic Kafka
`contract.events`, `pricing.events`, `billing.events`, `workflow.events`, `esign.events`.

## 4. Sequence — Duyệt hợp đồng
```mermaid
sequenceDiagram
  participant U as Sales
  participant CON as contract
  participant WF as workflow
  participant K as Kafka
  participant NOT as notification
  U->>CON: POST /contracts/{id}/submit
  CON->>WF: POST /workflows/instances (CONTRACT)
  WF-->>CON: instance_id (Submitted)
  WF->>K: StepAssigned (Outbox)
  K->>NOT: notify assignee
  loop mỗi bước
    U->>WF: POST /tasks/{id}/approve
    WF->>K: StepAssigned / DocApproved
  end
  K->>CON: DocApproved → contract = Approved
  K->>NOT: notify requester
```

## 5. Sequence — Bảng thanh toán + ký điện tử
```mermaid
sequenceDiagram
  participant ACC as Kế toán
  participant BIL as billing
  participant CON as contract
  participant PRI as pricing
  participant WF as workflow
  participant ES as mock-esign
  participant K as Kafka
  ACC->>BIL: POST /payments/generate
  BIL->>CON: GET /contracts/{id} (PAY-01)
  BIL->>PRI: GET /pricing/effective (PAY-03 copy giá)
  ACC->>BIL: submit → WF (PAYMENT)
  ACC->>WF: approve các bước
  WF->>WF: bước cuối → DocApproved + start_signing
  WF->>ES: POST /sign (async)
  ES-->>WF: callback signed
  WF->>K: esign.events: Signed
  K->>BIL: Signed → payment = Issued
```

## 6. Quyết định thiết kế
- **DB-per-service**: 1 cụm Postgres, mỗi service 1 database → cô lập dữ liệu, nhẹ tài nguyên.
- **Workflow data-driven**: quy trình lưu trong bảng (`workflow_definitions/step_defs`), engine đọc DB → không hard-code if/else theo loại hồ sơ.
- **Outbox Pattern**: đảm bảo "ghi DB + phát event" nguyên tử, chống mất event.
- **Zero-trust nội bộ**: mỗi service vẫn tự verify JWT dù đã qua gateway.
