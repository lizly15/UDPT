# Business Rules & cách hiện thực

## Hợp đồng (CTR)
| Mã | Rule | Cách enforce |
|---|---|---|
| CTR-01 | Chỉ sửa ở Draft/RevisionRequested | `logic.ensure_editable` |
| CTR-02 | Submit cần KH + hiệu lực hợp lệ + tài liệu | `logic.validate_for_submit` |
| CTR-03 | Không nhảy thẳng Draft→Approved | chỉ đổi Approved qua consumer nhận `DocApproved` |
| CTR-04 | Rejected không tự sửa & submit lại | trạng thái Rejected không thuộc EDITABLE |
| CTR-05 | Approved→Active khi tới ngày hiệu lực | `logic.activate` kiểm tra `effective_from` |
| CTR-06 | Active không xóa; chuyển Cancelled/Expired | `logic.cancel` |
| CTR-07 | Thay đổi điều khoản quan trọng → tạo phụ lục | endpoint appendix chỉ cho Approved/Active |

## Bảng giá (PRC)
| Mã | Rule | Cách enforce |
|---|---|---|
| PRC-01 | Gắn phạm vi áp dụng rõ ràng | `PriceList.customer_code` bắt buộc |
| PRC-02 | Ngày bắt đầu ≤ ngày kết thúc | `logic.validate_dates` |
| PRC-03 | Không chồng hiệu lực (cùng đối tượng) | `logic.check_overlap` khi submit |
| PRC-04 | Version cũ Superseded/hết hiệu lực | `apply_workflow_result` cap ngày + đánh dấu |
| PRC-05 | Bảng giá đã dùng không sửa trực tiếp | billing copy đơn giá; tạo version mới |
| PRC-06 | Rejected có thể sửa & submit lại | trạng thái Rejected cho submit lại |

## Bảng thanh toán (PAY)
| Mã | Rule | Cách enforce |
|---|---|---|
| PAY-01 | Chỉ lập khi HĐ còn hiệu lực + có bảng giá | `generate_statement` kiểm tra contract + pricing |
| PAY-02 | Sản lượng đúng kỳ & đã khóa | truy vấn `locked=True`, đúng `period` |
| PAY-03 | Lưu đơn giá tại thời điểm tính | copy `unit_price` vào `PaymentLine` |
| PAY-04 | Không submit nếu tổng âm/thiếu dòng | kiểm tra ở `submit_payment` |
| PAY-05 | Approved/Signed không sửa trực tiếp | không có endpoint sửa; tạo hồ sơ điều chỉnh |
| PAY-06 | Chỉ gửi ký sau khi Approved nội bộ | workflow tự khởi động ký khi PAYMENT Approved |
| PAY-07 | Ký thất bại phản ánh rõ | trạng thái `SignFailed` + retry |

## Phê duyệt & Ký điện tử (APR)
| Mã | Rule | Cách enforce |
|---|---|---|
| APR-01 | Chỉ đúng người được giao bước hiện tại | `engine.act` so `user.username == task.assignee_username` |
| APR-02 | Không nhảy bước / duyệt lại bước xong | kiểm tra `step_order == current_step_order` + `status==pending` |
| APR-03 | Reject/revision phải có lý do | bắt buộc `comment` |
| APR-04 | Reject → Rejected/Revision | nhánh trong `engine.act` |
| APR-05 | Bước cuối approve → Approved + phát event | emit `DocApproved` |
| APR-06 | Ký bất đồng bộ + callback | mock-esign → `/internal/esign/callback` |
| APR-07 | Service phụ lỗi không hỏng nghiệp vụ chính | Outbox + trạng thái chờ/retry |

## Ràng buộc kỹ thuật (mục 5.5) — điểm nâng cao
- **Double submit (SC-09)**: `Idempotency-Key` (Redis, gateway) + unique instance trong workflow (`create_instance` trả instance đang mở).
- **Race condition duyệt (SC-05)**: optimistic locking `version_id` trên `WorkflowInstance` → `StaleDataError` → 409.
- **Event bị mất**: **Outbox Pattern** (ghi DB + outbox cùng transaction, relay publish Kafka, đánh dấu sent) + consumer idempotent.
- **Phân quyền theo ngữ cảnh (SC-08)**: kiểm tra assignee cụ thể, không chỉ role.
- **Dữ liệu lịch sử (SC-04/10)**: chọn bảng giá theo ngày + copy đơn giá cứng.
