# Danh sách công việc Frontend (FE-A & FE-B)

Checklist chi tiết từng màn hình. Mỗi mục là 1 việc cần làm. Endpoint đầy đủ ở `docs/api.md`.
Component dùng chung đã có sẵn: `PageHeader, DataTable, Modal, FormField, StatusBadge, ApprovalTimeline, Feedback(Spinner/EmptyState/ErrorBox)`.
Mẫu tham khảo: `pages/Customers.tsx` (FE-A), `pages/Notifications.tsx` (FE-B).

## PHÂN CÔNG CUỐI CÙNG (mỗi bạn 4 màn)

| Màn hình | File | Người làm |
|---|---|---|
| Khách hàng | `Customers.tsx` | ✅ trợ lý (mẫu) |
| Thông báo | `Notifications.tsx` | ✅ trợ lý (mẫu) |
| Chi tiết hợp đồng | `ContractDetail.tsx` | ✅ trợ lý (đã làm) |
| Chi tiết bảng thanh toán + ký | `PaymentDetail.tsx` | ✅ trợ lý (đã làm) |
| **Dịch vụ** | `ServiceCatalog.tsx` | **FE-A** |
| **Hợp đồng (list)** | `Contracts.tsx` | **FE-A** |
| **Bảng giá** | `Pricing.tsx` | **FE-A** |
| **Nhật ký** | `Audit.tsx` | **FE-A** |
| **Sản lượng** | `Volumes.tsx` | **FE-B** |
| **Bảng thanh toán (list)** | `Payments.tsx` | **FE-B** |
| **Chờ tôi duyệt** | `ApprovalInbox.tsx` | **FE-B** |
| **Quản trị** | `Admin.tsx` | **FE-B** |

> FE-A và FE-B mỗi người **4 màn dễ**; 2 màn chi tiết khó (có timeline + ký điện tử async) trợ lý đã làm sẵn để tham khảo. Chi tiết từng màn ở dưới.

---

**Yêu cầu chung cho MỌI màn (Definition of Done):**
- [ ] Gọi API thật qua `api` trong `src/api/client.ts` (không hardcode dữ liệu).
- [ ] Xử lý 3 trạng thái: đang tải (`Spinner`), rỗng (`EmptyState`), lỗi (`ErrorBox` + `errMsg(e)`).
- [ ] Ẩn nút thao tác nếu không đủ quyền: `const { hasRole } = useAuth()`.
- [ ] Sau thao tác ghi (tạo/submit/duyệt) → load lại dữ liệu.
- [ ] Trạng thái hiển thị bằng `<StatusBadge/>`.
- [ ] Thao tác tạo/submit gửi kèm Idempotency-Key: `api.post(path, body, crypto.randomUUID())`.
- [ ] Lưu ý bất đồng bộ: sau khi duyệt/ký, trạng thái hồ sơ đổi **trễ vài giây** → cần bấm refresh hoặc poll.

---

# 👤 FE-A — Kinh doanh & Dữ liệu gốc

## A0. Khách hàng — `pages/Customers.tsx` ✅ (đã làm mẫu)
Đã hoàn chỉnh (list + tạo). *Tùy chọn nâng cấp:*
- [ ] Nút sửa khách hàng (`PUT /customers/{code}` mở `Modal`).
- [ ] Nút tạm ngưng/kích hoạt (`PATCH /customers/{code}/status` với `{status:"Inactive"|"Active"}`).
- [ ] Trang/panel chi tiết KH: hiển thị hợp đồng liên quan (`GET /contracts?customer_code=`).

## A1. Danh mục dịch vụ — `pages/ServiceCatalog.tsx`
- [ ] Load `GET /services` → `DataTable` (Mã, Tên, Đơn vị).
- [ ] Nút "Thêm dịch vụ" (role SALES/SALES_MANAGER/ADMIN) → `Modal` + `FormField` (code, name, unit) → `POST /services`.
- [ ] Validate: code không rỗng; hiện lỗi trả về (vd `SERVICE_EXISTS`).

## A2. Hợp đồng (danh sách) — `pages/Contracts.tsx`
- [ ] Load `GET /contracts` → `DataTable` (Mã, Khách hàng, Tiêu đề, Giá trị, `StatusBadge`).
- [ ] Bộ lọc theo `customer_code` và `status` (query param).
- [ ] `DataTable` `onRowClick` → điều hướng `/contracts/{code}` (dùng `useNavigate`).
- [ ] Nút "Tạo hợp đồng" (role SALES) → `Modal` + form (code, customer_code, title, value, payment_terms, service_terms) → `POST /contracts`.
  - Gợi ý: `customer_code` nên là dropdown lấy từ `GET /customers`.

## A3. Chi tiết hợp đồng — `pages/ContractDetail.tsx` ✅ (trợ lý đã làm — không cần làm)
- [ ] Load `GET /contracts/{code}` → hiển thị đầy đủ field + `StatusBadge`.
- [ ] Form sửa (chỉ khi status ∈ {Draft, RevisionRequested}) → `PUT /contracts/{code}` (title, effective_from, effective_to, value, has_attachment...).
  - Nhớ có field **đính kèm tài liệu** (`has_attachment`) — bắt buộc trước khi Submit (CTR-02).
- [ ] Nút **Submit** (status Draft/Revision) → `POST /contracts/{code}/submit`. Hiển thị lỗi nếu thiếu điều kiện (NO_ATTACHMENT/NO_EFFECTIVE).
- [ ] Nút **Kích hoạt** (status Approved) → `POST /contracts/{code}/activate`.
- [ ] Nút **Hủy** → `POST /contracts/{code}/cancel`.
- [ ] Ẩn/hiện các nút theo `status` hiện tại.
- [ ] Nhúng `<ApprovalTimeline docType="CONTRACT" docId={code} />` (đã có sẵn).
- [ ] Phần **Phụ lục**: list `GET /contracts/{code}/appendices`; nút thêm (chỉ khi Approved/Active) → `POST /contracts/{code}/appendices` (title, content, effective_date).

## A4. Bảng giá — `pages/Pricing.tsx`
- [ ] Load `GET /pricing/lists?customer_code=` → hiển thị mỗi bảng giá + danh sách version (version_no, hiệu lực, `StatusBadge`).
- [ ] Nút "Tạo bảng giá" → `POST /pricing/lists` (code, name, customer_code).
- [ ] Nút "Tạo version" → `Modal` có **bảng nhập nhiều dòng** items (service_code + unit_price) + effective_from/to → `POST /pricing/lists/{code}/versions`.
- [ ] Nút **Submit version** (status Draft/Rejected) → `POST /pricing/versions/{id}/submit`. Xử lý lỗi `EFFECTIVE_OVERLAP` (PRC-03).
- [ ] (Tùy chọn) Ô tra cứu "giá hiệu lực": nhập service_code + ngày → `GET /pricing/effective?customer_code=&service_code=&date=`.

---

# 👤 FE-B — Khai thác, Kế toán & Xuyên suốt

## B0. Thông báo — `pages/Notifications.tsx` ✅ (đã làm mẫu)
Đã hoàn chỉnh (list + đánh dấu đã đọc). *Tùy chọn:* thêm bộ lọc `unread_only`.

## B1. Chờ tôi duyệt — `pages/ApprovalInbox.tsx`
- [ ] Load `GET /tasks/inbox` → `DataTable` (bước, tên bước, hồ sơ). (Chỉ hiện task được giao đúng người đang đăng nhập.)
- [ ] Mỗi dòng có 3 nút: **Duyệt / Từ chối / Yêu cầu chỉnh sửa** → mở `Modal` nhập `comment`.
  - `POST /tasks/{id}/approve` `{comment}` (comment tùy chọn).
  - `POST /tasks/{id}/reject` `{comment}` — **bắt buộc comment**.
  - `POST /tasks/{id}/request-revision` `{comment}` — **bắt buộc comment**.
- [ ] Xử lý lỗi: `NOT_ASSIGNEE` (403), `CONCURRENT_UPDATE`/`NOT_CURRENT_STEP` (409) → hiện thông báo + load lại.
- [ ] Sau khi duyệt → load lại inbox (task chuyển sang người bước kế).

## B2. Sản lượng — `pages/Volumes.tsx`
- [ ] Load `GET /volumes?customer_code=&period=` → `DataTable` (ngày, dịch vụ, số lượng, kỳ, đã khóa?).
- [ ] Bộ lọc theo khách hàng + kỳ (period `YYYY-MM`).
- [ ] Nút "Nhập sản lượng" (role OPERATIONS/ADMIN) → `Modal` form (customer_code, service_code, record_date, quantity) → `POST /volumes`.
- [ ] Nút **Khóa kỳ** → `POST /volumes/lock` `{customer_code, period}`. (Sau khi khóa mới lập được bảng thanh toán.)
- [ ] Hiển thị rõ trạng thái khóa (badge/khác màu).

## B3. Bảng thanh toán (danh sách) — `pages/Payments.tsx`
- [ ] Load `GET /payments?customer_code=&status=` → `DataTable` (mã, kỳ, tổng tiền, `StatusBadge`).
- [ ] `onRowClick` → `/payments/{id}`.
- [ ] Nút "Lập bảng thanh toán" (role ACCOUNTANT) → `Modal` (customer_code, contract_code, period) → `POST /payments/generate`.
  - Xử lý lỗi: `CONTRACT_EXPIRED`, `CONTRACT_NOT_ACTIVE`, `NO_VOLUME`, `NO_PRICE`, `STATEMENT_EXISTS`.

## B4. Chi tiết bảng thanh toán — `pages/PaymentDetail.tsx` ✅ (trợ lý đã làm — không cần làm)
- [ ] Load `GET /payments/{id}` → bảng dòng dịch vụ (`DataTable`: service_code, quantity, unit_price, amount) + subtotal/tax/total.
- [ ] Nút **Submit** (status Draft, role ACCOUNTANT) → `POST /payments/{id}/submit`. Lỗi `INVALID_TOTAL` nếu tổng ≤ 0.
- [ ] Hiển thị **trạng thái ký điện tử**: `GET /workflows/esign/{id}` → badge (pending/signing/signed/failed). Nên **poll** vài giây khi đang Signing.
- [ ] Nút **Gửi ký lại** (khi failed) → `POST /workflows/esign/{id}/retry`.
- [ ] Nhúng `<ApprovalTimeline docType="PAYMENT" docId={id} />`.

## B5. Nhật ký truy vết — `pages/Audit.tsx`
- [ ] Ô lọc `doc_id` và/hoặc `doc_type` → `GET /audit?doc_id=&doc_type=` (role ADMIN/DIRECTOR/ACCOUNTANT).
- [ ] `DataTable` (thời gian, actor, action, doc_type, doc_id), sắp xếp mới nhất trước.

## B6. Quản trị — `pages/Admin.tsx`
- [ ] Tab **Người dùng**: `GET /users` → `DataTable`; nút tạo user → `Modal` (username, password, full_name, department, roles[]) → `POST /users`.
  - Lấy danh sách role: `GET /users/roles`.
- [ ] Tab **Quy trình duyệt**: `GET /workflows/definitions` → hiển thị từng doc_type + các bước (order, tên, role, assignee).
- [ ] Toàn bộ trang chỉ cho role ADMIN.

---

## Việc chung cuối cùng (cả hai)
- [ ] Kiểm thử trọn luồng với các tài khoản demo tương ứng (sale01, ops01, account01, director01, admin).
- [ ] Chụp screenshot mỗi màn → lưu `report/screenshots/` để chèn vào báo cáo.
- [ ] Rà lại RBAC: đăng nhập từng role, đảm bảo chỉ thấy/nút được phép.
- [ ] (Tùy chọn) Thêm badge đếm thông báo/hồ sơ chờ duyệt.
