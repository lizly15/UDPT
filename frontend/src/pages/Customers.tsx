// MÀN HÌNH MẪU — copy pattern này cho các module khác (list + tạo + gọi API thật).
import { useEffect, useState } from "react";
import { api, ApiError } from "../api/client";
import { useAuth } from "../context/AuthContext";
import StatusBadge from "../components/StatusBadge";
import type { Customer } from "../types";

export default function Customers() {
  const { hasRole } = useAuth();
  const canWrite = hasRole("SALES", "SALES_MANAGER", "ADMIN");
  const [items, setItems] = useState<Customer[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ code: "", name: "", tax_code: "", customer_type: "" });
  const [error, setError] = useState("");

  function load() {
    api.get<Customer[]>("/customers").then(setItems).catch(() => {});
  }
  useEffect(load, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await api.post("/customers", form, crypto.randomUUID()); // Idempotency-Key
      setShowForm(false);
      setForm({ code: "", name: "", tax_code: "", customer_type: "" });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Lỗi");
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">Khách hàng</h1>
        {canWrite && (
          <button className="btn-primary" onClick={() => setShowForm((s) => !s)}>
            + Thêm khách hàng
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={create} className="card mb-4 grid grid-cols-4 gap-3 p-4">
          <input className="input" placeholder="Mã (KH0006)" value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })} required />
          <input className="input" placeholder="Tên khách hàng" value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <input className="input" placeholder="MST" value={form.tax_code}
            onChange={(e) => setForm({ ...form, tax_code: e.target.value })} />
          <input className="input" placeholder="Loại (Logistics/FMCG)" value={form.customer_type}
            onChange={(e) => setForm({ ...form, customer_type: e.target.value })} />
          {error && <div className="col-span-4 text-xs text-red-600">{error}</div>}
          <div className="col-span-4">
            <button className="btn-primary">Lưu</button>
          </div>
        </form>
      )}

      <table className="w-full card overflow-hidden text-sm">
        <thead>
          <tr>
            <th className="th">Mã</th><th className="th">Tên</th><th className="th">MST</th>
            <th className="th">Loại</th><th className="th">Trạng thái</th>
          </tr>
        </thead>
        <tbody>
          {items.map((c) => (
            <tr key={c.code}>
              <td className="td font-medium">{c.code}</td>
              <td className="td">{c.name}</td>
              <td className="td">{c.tax_code}</td>
              <td className="td">{c.customer_type}</td>
              <td className="td"><StatusBadge status={c.status} /></td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr><td className="td text-slate-400" colSpan={5}>Chưa có dữ liệu</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
