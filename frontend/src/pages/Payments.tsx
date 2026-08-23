// OWNER: FE-B · Module: Bảng thanh toán
// Endpoints: GET /payments?customer_code=&status= · POST /payments/generate {customer_code,contract_code,period}
//            (chi tiết + submit + ký ở PaymentDetail)
// Gợi ý: DataTable (mã, kỳ, tổng tiền, StatusBadge, onRowClick -> /payments/:id); Modal "Lập bảng thanh toán".
import PageHeader from "../components/PageHeader";
import { EmptyState } from "../components/Feedback";

export default function Payments() {
  // TODO(FE-B): load /payments; nút generate; click dòng -> /payments/:id
  return (
    <div>
      <PageHeader title="Bảng thanh toán" />
      <EmptyState text="TODO (FE-B): danh sách + lập bảng thanh toán" />
    </div>
  );
}
