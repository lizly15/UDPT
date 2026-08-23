# Bàn giao & Phân công Frontend (2 người)

Tài liệu để giao phần giao diện cho 2 thành viên. Backend đã xong và chạy được; FE chỉ gọi API.

---

## A. Bàn giao những gì (checklist)

Đưa cho 2 bạn FE các thứ sau:

1. **Mã nguồn + backend chạy được**: clone repo, `cd DATH`, chạy:
   ```bash
   cp .env.example .env
   make up            # dựng toàn bộ backend (Docker)
   python3 scripts/seed.py   # nạp dữ liệu mẫu A.1–A.8
   ```
   → API Gateway sẵn ở `http://localhost:8080/api` (đã bật CORS cho web).
2. **`docs/api.md`** — danh sách toàn bộ endpoint + quy ước (auth, lỗi, roles, idempotency).
3. **Swagger** từng service (`:8001..:8007/docs`) để thử API trực tiếp.
4. **`design/design-system.md`** — token màu, typography, component chuẩn (để UI đồng nhất + dựng Figma).
5. **Khung frontend mẫu** `frontend/` (Vite + React + TS + Tailwind) đã có sẵn: API client, auth, layout, trang Login + 1 màn hình mẫu (Customers). **Copy pattern này để làm các màn còn lại.**
6. **Tài khoản demo**: mật khẩu `pass123` (admin `admin123`) — `sale01, manager01, legal01, account01, director01, ops01, admin`.
7. **Base URL cấu hình**: file `frontend/.env` → `VITE_API_BASE=http://localhost:8080/api`.

---

## B. Chuẩn kỹ thuật thống nhất (bắt buộc đọc trước khi code)

- **Tech stack**: Vite + React + TypeScript + TailwindCSS (khung đã dựng sẵn ở `frontend/`).
- **Gọi API**: chỉ dùng `src/api/client.ts` (đã tự gắn `Authorization`, tự refresh token khi 401).
- **Auth**: token lưu ở `localStorage`; roles lấy từ `/auth/me`. Ẩn/hiện nút theo role (RBAC ở UI).
- **Lỗi**: mọi API trả `{"error":{"code,message,details}}` → hiển thị `message` bằng Toast; lỗi form đọc `details`.
- **Idempotency**: khi POST tạo/submit, thêm header `Idempotency-Key` (helper `postIdempotent`).
- **Trạng thái**: luôn dùng `<StatusBadge/>` (màu theo design-system).
- **Kiểu dữ liệu chung**: khai báo trong `src/types.ts` (2 người chỉnh chung file này, thống nhất trước).
- **Git**: mỗi module 1 nhánh, PR review chéo; không sửa `src/api/client.ts` và `src/types.ts` mà không báo nhau.

---

## C. Phân công 2 người — ĐỘC LẬP TUYỆT ĐỐI

> Khung đã được chuẩn bị để 2 người **không đụng file của nhau**. Mỗi người CHỈ sửa các file trang thuộc module mình + file type domain của mình.

### Quy tắc vàng
- **KHÔNG sửa** các file đã đóng băng (đã hoàn chỉnh): `src/api/client.ts`, `src/context/AuthContext.tsx`, `src/components/*` (Layout, StatusBadge, Modal, DataTable, FormField, PageHeader, ApprovalTimeline, Feedback), `src/App.tsx` (routes đã wire sẵn), `src/pages/Login.tsx`, `src/pages/Dashboard.tsx`, `src/types/index.ts`.
- Mỗi người **chỉ tạo/sửa** các file trong danh sách của mình bên dưới.
- Cần type mới → thêm vào **file type domain của mình** (`src/types/<domain>.ts`), không đụng file người khác.
- Component chung đã đủ dùng; nếu thật sự cần thêm, tạo trong `src/components/` với **tên có tiền tố** để không trùng (vd `AXFooBar.tsx`).

### File của FE-A (Kinh doanh & Dữ liệu gốc)
| File trang | Type domain |
|---|---|
| `src/pages/Customers.tsx` *(đã làm mẫu hoàn chỉnh)* | `src/types/customer.ts` |
| `src/pages/ServiceCatalog.tsx` | `src/types/customer.ts` |
| `src/pages/Contracts.tsx` · `src/pages/ContractDetail.tsx` | `src/types/contract.ts` |
| `src/pages/Pricing.tsx` | `src/types/pricing.ts` |

### File của FE-B (Khai thác, Kế toán & Xuyên suốt)
| File trang | Type domain |
|---|---|
| `src/pages/Notifications.tsx` *(đã làm mẫu hoàn chỉnh)* | `src/types/notification.ts` |
| `src/pages/ApprovalInbox.tsx` | `src/types/workflow.ts` |
| `src/pages/Volumes.tsx` | `src/types/volume.ts` |
| `src/pages/Payments.tsx` · `src/pages/PaymentDetail.tsx` | `src/types/payment.ts` |
| `src/pages/Audit.tsx` | `src/types/notification.ts` |
| `src/pages/Admin.tsx` | `src/types/admin.ts` |

> Mỗi file trang đã có sẵn comment đầu file ghi rõ **endpoint + component nên dùng + TODO**. Có 2 màn mẫu hoàn chỉnh để copy pattern: `Customers.tsx` (FE-A) và `Notifications.tsx` (FE-B).
> Vì mỗi route/file đã tách riêng, **không có merge conflict** giữa 2 người → làm việc song song hoàn toàn.

---

### (Tham khảo) Nội dung nghiệp vụ từng người

### 👤 FE-A — "Kinh doanh & Dữ liệu gốc" + Nền tảng app
> Người này làm khung chung TRƯỚC (ngày 1) để FE-B có cái mà cắm vào.

**Nền tảng (làm ngay, ưu tiên):**
- [ ] Hoàn thiện khung `frontend/`: API client + interceptor refresh token, `AuthContext`, router + route bảo vệ, Layout (sidebar + topbar + chuông), Toast, các component chung (`Button, StatusBadge, DataTable, FormField, Modal, PageHeader, ApprovalTimeline`).
- [ ] Trang **Login** (`/auth/login`, lưu token, gọi `/auth/me`).
- [ ] **Dashboard**: thẻ tổng quan (đếm hợp đồng theo trạng thái, số hồ sơ chờ tôi duyệt, số bảng thanh toán) + 5 thông báo gần nhất.

**Màn hình phụ trách:**
- [ ] **Customers**: list + tìm kiếm, form tạo/sửa, chi tiết + danh sách HĐ liên quan, tạm ngưng. (`/customers`, `/services`)
- [ ] **Service catalog**: list + tạo. (`/services`)
- [ ] **Contracts**: list/lọc, form tạo, **chi tiết + ApprovalTimeline** (`/workflows/by-doc/CONTRACT/{code}`), nút submit/activate/cancel, tab phụ lục. (`/contracts`, `/contracts/{code}/appendices`)
- [ ] **Pricing**: danh sách bảng giá, tạo version (bảng nhập items), submit, tra cứu giá hiệu lực. (`/pricing/*`)

### 👤 FE-B — "Khai thác, Kế toán & Xuyên suốt"
> Bắt đầu bằng Approval Inbox + Notifications (dựa trên khung FE-A giao ngày 1).

- [ ] **Approval Inbox**: `/tasks/inbox` → danh sách bước chờ tôi duyệt; modal **Approve / Reject / Request-revision** (bắt buộc comment khi reject). Hiện tên hồ sơ + bước. (`/tasks/*`)
- [ ] **Notifications**: chuông + đếm chưa đọc (poll), danh sách, đánh dấu đã đọc. (`/notifications`)
- [ ] **Volumes (Khai thác)**: form nhập sản lượng, list theo KH/kỳ, nút **khóa kỳ**. (`/volumes`, `/volumes/lock`)
- [ ] **Payments (Kế toán)**: form generate bảng thanh toán, list, **chi tiết bảng dòng dịch vụ + tổng tiền**, submit, **badge trạng thái ký điện tử** + nút gửi ký lại. (`/payments/*`, `/workflows/esign/{id}`)
- [ ] **Audit log**: bộ lọc theo hồ sơ + bảng. (`/audit`)
- [ ] **Admin**: quản lý user + gán role; xem cấu hình quy trình duyệt. (`/users`, `/workflows/definitions`)

### Việc chung (thống nhất cùng nhau)
- Chốt `src/types.ts` (kiểu Contract, Payment, Task, …) ngay đầu dự án.
- Thống nhất màu badge & component (theo `design/design-system.md`).
- Cuối mỗi ngày merge để tích hợp; test bằng dữ liệu seed.

---

## D. "Definition of Done" cho mỗi màn hình
Một màn hình coi là xong khi:
1. Gọi **API thật** qua `client.ts` (không hardcode dữ liệu).
2. Có xử lý **loading / empty / error** (hiện Toast lỗi).
3. **RBAC**: ẩn nút thao tác nếu user không đủ quyền (theo bảng role ở `docs/api.md`).
4. Dùng đúng **StatusBadge** và component chung.
5. Chạy được trọn luồng với tài khoản demo tương ứng.

---

## E. Cách hướng dẫn 2 bạn (buổi kickoff ~45 phút)
1. Cùng chạy `make up` + `seed.py`, mở Swagger, đăng nhập bằng script để thấy dữ liệu.
2. Đi qua **luồng chính** (mục cuối `docs/api.md`): tạo HĐ → duyệt → thông báo → thanh toán → ký.
3. Mở khung `frontend/`, chạy `npm install && npm run dev`, xem trang **Login + Customers mẫu** → giải thích cấu trúc (api/, components/, pages/, context/).
4. Giao `docs/frontend-handover.md` này + phân công mục C.
5. Hẹn mốc: **ngày 1** FE-A xong khung + Login; **ngày 2-3** mỗi người 2-3 màn; **ngày 4** tích hợp + chụp screenshot cho report.

---

## F. Lưu ý kỹ thuật hay vướng
- **CORS**: đã bật ở gateway (`allow_origins=*`) — web gọi trực tiếp `:8080` được.
- **401 giữa chừng**: interceptor tự gọi `/auth/refresh`; nếu refresh hỏng → về Login.
- **Bất đồng bộ**: sau khi duyệt xong, trạng thái hồ sơ (Contract/Payment) cập nhật **trễ vài giây** (do Kafka). FE nên **poll lại** hoặc có nút refresh (đừng kỳ vọng đổi trạng thái tức thì).
- **Ký điện tử**: sau khi bảng thanh toán `Approved`, hệ thống tự ký → `Issued` sau ~2-5s; FE poll `/payments/{id}` để thấy đổi.
