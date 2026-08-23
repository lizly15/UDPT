// Module: Chi tiết bảng thanh toán — dòng dịch vụ + submit + ký điện tử (poll) + timeline
import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { api, errMsg } from "../api/client";
import { useAuth } from "../context/AuthContext";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import DataTable, { Column } from "../components/DataTable";
import ApprovalTimeline from "../components/ApprovalTimeline";
import { ErrorBox, Spinner } from "../components/Feedback";
import type { Payment, PaymentLine, SigningSession } from "../types/payment";

const fmt = (n: number) => Number(n).toLocaleString("vi-VN");

export default function PaymentDetail() {
  const { id = "" } = useParams();
  const { hasRole } = useAuth();
  const canAcc = hasRole("ACCOUNTANT", "ADMIN");
  const [p, setP] = useState<Payment | null>(null);
  const [esign, setEsign] = useState<SigningSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const timer = useRef<number | null>(null);

  function loadEsign() {
    api.get<SigningSession>(`/workflows/esign/${id}`).then(setEsign).catch(() => {});
  }
  function load() {
    api.get<Payment>(`/payments/${id}`)
      .then((d) => { setP(d); loadEsign(); })
      .catch((e) => setError(errMsg(e)))
      .finally(() => setLoading(false));
  }
  useEffect(() => { load(); return () => { if (timer.current) clearInterval(timer.current); }; }, [id]);

  // Poll khi hồ sơ đang trong giai đoạn duyệt/ký (trạng thái đổi bất đồng bộ)
  useEffect(() => {
    const pending = p && ["Submitted", "Approved", "Signing"].includes(p.status);
    if (pending && !timer.current) {
      timer.current = window.setInterval(load, 3000);
    } else if (!pending && timer.current) {
      clearInterval(timer.current); timer.current = null;
    }
  }, [p?.status]);

  async function submit() {
    setError("");
    try { await api.post(`/payments/${id}/submit`, {}, crypto.randomUUID()); load(); }
    catch (e) { setError(errMsg(e)); }
  }
  async function retry() {
    setError("");
    try { await api.post(`/workflows/esign/${id}/retry`); loadEsign(); }
    catch (e) { setError(errMsg(e)); }
  }

  if (loading) return <Spinner />;
  if (!p) return <ErrorBox message={error || "Không tìm thấy bảng thanh toán"} />;

  const cols: Column<PaymentLine>[] = [
    { key: "service_code", label: "Dịch vụ" },
    { key: "quantity", label: "Số lượng", render: (r) => fmt(r.quantity) },
    { key: "unit_price", label: "Đơn giá", render: (r) => fmt(r.unit_price) },
    { key: "amount", label: "Thành tiền", render: (r) => fmt(r.amount) },
  ];

  return (
    <div>
      <PageHeader title={`Bảng thanh toán ${p.code}`} action={<StatusBadge status={p.status} />} />
      {error && <ErrorBox message={error} />}

      <div className="card mb-3 grid grid-cols-3 gap-3 p-4 text-sm">
        <div><b>Khách hàng:</b> {p.customer_code}</div>
        <div><b>Hợp đồng:</b> {p.contract_code}</div>
        <div><b>Kỳ:</b> {p.period}</div>
      </div>

      <DataTable columns={cols} rows={p.lines} empty="Không có dòng dịch vụ" />
      <div className="card mt-2 p-3 text-right text-sm">
        <div>Tạm tính: <b>{fmt(p.subtotal)} đ</b></div>
        <div>Thuế: {fmt(p.tax)} đ</div>
        <div className="text-base">Tổng cộng: <b className="text-primary">{fmt(p.total)} đ</b></div>
      </div>

      <div className="mt-3 flex items-center gap-3">
        {canAcc && p.status === "Draft" &&
          <button className="btn-primary" onClick={submit}>Gửi duyệt</button>}
        {esign && esign.status !== "none" && (
          <span className="text-sm">Ký điện tử: <StatusBadge status={esign.status} />
            {esign.provider_ref && <span className="ml-1 text-xs text-slate-400">{esign.provider_ref}</span>}
          </span>
        )}
        {esign?.status === "failed" &&
          <button className="btn-secondary" onClick={retry}>Gửi ký lại</button>}
      </div>

      <div className="card mt-4 p-4">
        <h3 className="mb-2 font-semibold">Tiến trình duyệt</h3>
        <ApprovalTimeline docType="PAYMENT" docId={id} />
      </div>
    </div>
  );
}
