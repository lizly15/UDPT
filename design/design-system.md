# Design System — Hệ thống Quản trị Kinh doanh

Tài liệu chuẩn giao diện để (1) dựng lại trên Figma và (2) code frontend đồng nhất giữa 2 người.

## 1. Nguyên tắc
- Giao diện **nghiệp vụ nội bộ** (back-office): rõ ràng, mật độ thông tin cao, ưu tiên bảng & form.
- Layout: **sidebar trái** (điều hướng theo module) + **topbar** (tên user, chuông thông báo) + **content**.
- Trạng thái luôn hiển thị bằng **badge màu** (Draft/Submitted/Approved/…).

## 2. Design tokens

### Màu
| Token | Hex | Dùng cho |
|---|---|---|
| `--color-primary` | `#1f4e79` | Xanh navy — thương hiệu, nút chính, header |
| `--color-primary-600` | `#2c6598` | hover |
| `--color-accent` | `#0ea5e9` | link, nhấn |
| `--bg` | `#f5f7fa` | nền trang |
| `--surface` | `#ffffff` | thẻ, bảng |
| `--border` | `#e2e8f0` | viền |
| `--text` | `#1e293b` | chữ chính |
| `--text-muted` | `#64748b` | chữ phụ |

### Màu trạng thái (badge)
| Trạng thái | Màu nền / chữ |
|---|---|
| Draft | xám `#e2e8f0` / `#475569` |
| Submitted / Signing / In-progress | vàng `#fef3c7` / `#92400e` |
| Approved / Effective / Active | xanh lá `#dcfce7` / `#166534` |
| Signed / Issued | xanh dương `#dbeafe` / `#1e40af` |
| Rejected / SignFailed / Cancelled | đỏ `#fee2e2` / `#991b1b` |
| RevisionRequested / Superseded | cam `#ffedd5` / `#9a3412` |

### Typography
- Font: **Inter / system-ui**. Cỡ: 13px (body), 12px (phụ), 20–24px (tiêu đề trang), 16px (tiêu đề thẻ).

### Spacing & bo góc
- Grid 4px; padding thẻ 16–24px; **radius 8px**; shadow nhẹ `0 1px 3px rgba(0,0,0,.08)`.

## 3. Component chuẩn (cả 2 người dùng chung)
- **Button**: primary (nền navy), secondary (viền), danger (đỏ). Có trạng thái loading.
- **StatusBadge(status)**: map màu theo bảng trên.
- **DataTable**: header dính, sort cơ bản, empty state, phân trang đơn giản.
- **FormField**: label + input + thông báo lỗi (đọc từ `error.details`).
- **Modal**: dùng cho form tạo & hộp thoại duyệt (approve/reject + comment).
- **ApprovalTimeline**: hiển thị các bước từ `/workflows/by-doc/{type}/{id}` — mỗi bước: tên, người duyệt, trạng thái, comment.
- **Toast**: thông báo thành công/lỗi (đọc `error.message`).
- **PageHeader**: tiêu đề + nút hành động chính bên phải.

## 4. Các màn hình (map với endpoint — chi tiết ở `docs/frontend-handover.md`)
1. Login
2. Dashboard (thẻ tổng quan + thông báo gần đây)
3. Customers (list/detail/form)
4. Service catalog
5. Contracts (list, detail + ApprovalTimeline + phụ lục, form)
6. Pricing (list + version + items)
7. Volumes (nhập + khóa kỳ)
8. Payments (generate, detail bảng dòng dịch vụ, ký điện tử)
9. Approval Inbox (tasks của tôi + duyệt)
10. Notifications
11. Audit log
12. Admin (users, workflow definitions)

## 5. Hướng dẫn dựng Figma
- Tạo **Styles** cho token màu + text ở trên.
- Tạo **Components**: Button, Badge, Input, Table row, Sidebar item, Card, Modal.
- Dựng 12 frame màn hình theo mục 4 (desktop 1440px).
- Dùng bộ dữ liệu mẫu (A.1–A.8) để điền nội dung cho giống thật.
- Mockup HTML tĩnh tham chiếu: `design/mockups/` (mở bằng trình duyệt để lấy bố cục).
