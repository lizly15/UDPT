// OWNER: FE-B · Module: Chờ tôi duyệt
// Endpoints: GET /tasks/inbox · POST /tasks/{id}/approve|reject|request-revision {comment}
// Gợi ý: DataTable các task; nút Approve/Reject/Yêu cầu sửa mở Modal nhập comment (reject bắt buộc comment).
//        Sau khi duyệt, load lại inbox. Xem pattern ở pages/Notifications.tsx.
import PageHeader from "../components/PageHeader";
import { EmptyState } from "../components/Feedback";

export default function ApprovalInbox() {
  // TODO(FE-B): load /tasks/inbox -> DataTable; Modal xác nhận approve/reject + comment
  return (
    <div>
      <PageHeader title="Chờ tôi duyệt" />
      <EmptyState text="TODO (FE-B): danh sách task + duyệt/từ chối (Modal + comment)" />
    </div>
  );
}
