// OWNER: FE-B · Module: Quản trị
// Endpoints: GET/POST /users · GET /users/roles · GET /workflows/definitions  (role ADMIN)
// Gợi ý: DataTable user + Modal tạo user (chọn roles); phần xem cấu hình quy trình duyệt.
import PageHeader from "../components/PageHeader";
import { EmptyState } from "../components/Feedback";

export default function Admin() {
  // TODO(FE-B): quản lý user + xem workflow definitions
  return (
    <div>
      <PageHeader title="Quản trị" />
      <EmptyState text="TODO (FE-B): quản lý người dùng + cấu hình quy trình" />
    </div>
  );
}
