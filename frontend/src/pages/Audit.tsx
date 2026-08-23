// OWNER: FE-B · Module: Nhật ký truy vết
// Endpoints: GET /audit?doc_id=&doc_type=  (role ADMIN/DIRECTOR/ACCOUNTANT)
// Gợi ý: ô lọc doc_id/doc_type + DataTable (thời gian, actor, action, doc).
import PageHeader from "../components/PageHeader";
import { EmptyState } from "../components/Feedback";

export default function Audit() {
  // TODO(FE-B): filter + load /audit -> DataTable
  return (
    <div>
      <PageHeader title="Nhật ký truy vết" />
      <EmptyState text="TODO (FE-B): lọc theo hồ sơ + bảng audit log" />
    </div>
  );
}
