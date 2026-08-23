// OWNER: FE-A · Module: Danh mục dịch vụ
// Endpoints: GET /services · POST /services {code,name,unit}  (role SALES/ADMIN)
// Gợi ý dùng: PageHeader, DataTable, Modal, FormField. Mẫu tham khảo: pages/Customers.tsx
import PageHeader from "../components/PageHeader";
import { EmptyState } from "../components/Feedback";

export default function ServiceCatalog() {
  // TODO(FE-A): load /services -> DataTable; nút "Thêm dịch vụ" mở Modal + FormField -> POST /services
  return (
    <div>
      <PageHeader title="Danh mục dịch vụ" />
      <EmptyState text="TODO (FE-A): hiện thực theo comment đầu file + docs/api.md" />
    </div>
  );
}
