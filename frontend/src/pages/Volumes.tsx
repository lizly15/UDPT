// OWNER: FE-B · Module: Sản lượng
// Endpoints: GET /volumes?customer_code=&period= · POST /volumes · POST /volumes/lock {customer_code,period}
// Gợi ý: DataTable sản lượng; form nhập (Modal); nút "Khóa kỳ". Role OPERATIONS/ADMIN.
import PageHeader from "../components/PageHeader";
import { EmptyState } from "../components/Feedback";

export default function Volumes() {
  // TODO(FE-B): load /volumes; nhập sản lượng; khóa kỳ
  return (
    <div>
      <PageHeader title="Sản lượng" />
      <EmptyState text="TODO (FE-B): nhập sản lượng + khóa kỳ" />
    </div>
  );
}
