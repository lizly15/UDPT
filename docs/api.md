# API Reference (dành cho Frontend)

Mọi request đi qua **API Gateway**: `http://localhost:8080/api` (prefix `/api`).
Swagger từng service: `:8001..:8007/docs`.

## Quy ước chung
- **Auth**: header `Authorization: Bearer <access_token>` (trừ `auth/login`, `auth/refresh`).
- **Lỗi**: mọi lỗi trả JSON dạng `{"error": {"code": "...", "message": "...", "details": ...}}`, kèm HTTP status (400/401/403/404/409/422/502).
- **Chống double-submit**: với POST tạo/submit, gửi thêm header `Idempotency-Key: <uuid>` (gateway sẽ trả lại kết quả cũ nếu bấm 2 lần).
- **Rate limit**: 120 req/phút/user (gateway trả 409/429 nếu vượt).
- **Roles**: `SALES, SALES_MANAGER, OPERATIONS, ACCOUNTANT, LEGAL, DIRECTOR, ADMIN`.
- **Tài khoản demo**: mật khẩu `pass123` (admin: `admin123`) — `sale01, manager01, legal01, account01, director01, ops01, admin`.

---

## 1. Auth & Users (identity-service)
| Method | Path | Role | Mô tả |
|---|---|---|---|
| POST | `/auth/login` | public | body `{username, password}` → `{access_token, refresh_token, roles, user_id, full_name}` |
| POST | `/auth/refresh` | public | body `{refresh_token}` → token mới |
| POST | `/auth/logout` | auth | thu hồi token hiện tại |
| GET | `/auth/me` | auth | thông tin user hiện tại |
| GET | `/users` | ADMIN | danh sách user |
| POST | `/users` | ADMIN | body `{username, password, full_name, department, roles[]}` |
| GET | `/users/roles` | ADMIN | danh sách role |

## 2. Khách hàng & Dịch vụ (customer-service)
| Method | Path | Role | Mô tả |
|---|---|---|---|
| GET | `/customers?status=` | auth | danh sách KH |
| GET | `/customers/{code}` | auth | chi tiết |
| POST | `/customers` | SALES/ADMIN | tạo KH |
| PUT | `/customers/{code}` | SALES/ADMIN | cập nhật |
| PATCH | `/customers/{code}/status` | SALES/ADMIN | `{status: Active\|Inactive}` (tạm ngưng) |
| GET | `/services` | auth | danh mục dịch vụ |
| POST | `/services` | SALES/ADMIN | `{code, name, unit}` |

## 3. Hợp đồng & Phụ lục (contract-service)
| Method | Path | Role | Mô tả |
|---|---|---|---|
| GET | `/contracts?customer_code=&status=` | auth | danh sách |
| GET | `/contracts/{code}` | auth | chi tiết (kèm appendices) |
| POST | `/contracts` | SALES | `{code, customer_code, title, value,...}` → Draft |
| PUT | `/contracts/{code}` | SALES | sửa (chỉ Draft/RevisionRequested) |
| POST | `/contracts/{code}/submit` | SALES | gửi duyệt → tạo workflow, status Submitted |
| POST | `/contracts/{code}/activate` | SALES | Approved → Active (khi tới ngày hiệu lực) |
| POST | `/contracts/{code}/cancel` | SALES | hủy |
| GET | `/contracts/{code}/appendices` | auth | danh sách phụ lục |
| POST | `/contracts/{code}/appendices` | SALES | tạo phụ lục (HĐ Approved/Active) |

**Trạng thái HĐ**: Draft → Submitted → Approved → Active → Expired; Rejected/RevisionRequested/Cancelled.

## 4. Bảng giá (pricing-service)
| Method | Path | Role | Mô tả |
|---|---|---|---|
| GET | `/pricing/lists?customer_code=` | auth | danh sách bảng giá (kèm versions) |
| POST | `/pricing/lists` | SALES | `{code, name, customer_code}` |
| POST | `/pricing/lists/{code}/versions` | SALES | `{effective_from, effective_to, items:[{service_code, unit_price}]}` |
| GET | `/pricing/versions/{id}` | auth | chi tiết version |
| POST | `/pricing/versions/{id}/submit` | SALES | gửi duyệt (kiểm tra chồng hiệu lực) |
| GET | `/pricing/effective?customer_code=&service_code=&date=` | auth | đơn giá áp dụng tại 1 ngày |

**Trạng thái version**: Draft → Submitted → Effective → Superseded/Expired; Rejected.

## 5. Sản lượng & Bảng thanh toán (billing-service)
| Method | Path | Role | Mô tả |
|---|---|---|---|
| POST | `/volumes` | OPERATIONS | `{customer_code, service_code, record_date, quantity}` |
| GET | `/volumes?customer_code=&period=` | auth | danh sách sản lượng |
| POST | `/volumes/lock` | OPERATIONS | `{customer_code, period}` khóa kỳ |
| POST | `/payments/generate` | ACCOUNTANT | `{customer_code, contract_code, period}` → sinh bảng thanh toán |
| GET | `/payments?customer_code=&status=` | auth | danh sách |
| GET | `/payments/{id}` | auth | chi tiết (kèm dòng dịch vụ) |
| POST | `/payments/{id}/submit` | ACCOUNTANT | gửi duyệt |

**Trạng thái BTT**: Draft → Submitted → Approved → Signing → Signed → Issued; Rejected/SignFailed.

## 6. Quy trình duyệt & Ký điện tử (workflow-service)
| Method | Path | Role | Mô tả |
|---|---|---|---|
| GET | `/workflows/definitions` | auth | các quy trình đã cấu hình |
| GET | `/workflows/instances/{id}` | auth | chi tiết 1 quy trình (các bước + trạng thái) |
| GET | `/workflows/by-doc/{doc_type}/{doc_id}` | auth | quy trình theo hồ sơ (dùng vẽ timeline duyệt) |
| GET | `/tasks/inbox` | auth | **các bước đang chờ CHÍNH tôi duyệt** |
| POST | `/tasks/{id}/approve` | assignee | `{comment}` |
| POST | `/tasks/{id}/reject` | assignee | `{comment}` (bắt buộc lý do) |
| POST | `/tasks/{id}/request-revision` | assignee | `{comment}` |
| GET | `/workflows/esign/{doc_id}` | auth | trạng thái phiên ký |
| POST | `/workflows/esign/{doc_id}/retry` | auth | gửi ký lại (khi thất bại) |

> `doc_type` ∈ `CONTRACT | PRICELIST | PAYMENT`. FE **không** tự tạo instance — các service tự tạo khi submit.

## 7. Thông báo & Nhật ký (notification-service)
| Method | Path | Role | Mô tả |
|---|---|---|---|
| GET | `/notifications?unread_only=` | auth | thông báo của tôi |
| POST | `/notifications/{id}/read` | auth | đánh dấu đã đọc |
| GET | `/audit?doc_id=&doc_type=` | ADMIN/DIRECTOR/ACCOUNTANT | nhật ký truy vết |

---

## Luồng chính (để FE dựng màn hình)
1. **Đăng nhập** → lưu access/refresh token → gọi `/auth/me` lấy roles.
2. **Kinh doanh**: tạo Customer → tạo Contract → `submit` → theo dõi qua `/workflows/by-doc/CONTRACT/{code}`.
3. **Người duyệt**: `/tasks/inbox` → approve/reject → nhận Notification.
4. **Khai thác**: nhập `/volumes` → `lock`.
5. **Kế toán**: `/payments/generate` → `submit` → duyệt → hệ thống tự ký → `Issued`.
6. **Thông báo/Audit**: cập nhật realtime bằng cách poll `/notifications`.
