// Module: Chi tiết hợp đồng — timeline duyệt + phụ lục + hành động theo trạng thái
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api, errMsg } from "../api/client";
import { useAuth } from "../context/AuthContext";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import Modal from "../components/Modal";
import ApprovalTimeline from "../components/ApprovalTimeline";
import { ErrorBox, Spinner } from "../components/Feedback";
import type { Appendix, Contract } from "../types/contract";

const WRITE = ["SALES", "SALES_MANAGER", "ADMIN"];

export default function ContractDetail() {
  const { code = "" } = useParams();
  const { hasRole } = useAuth();
  const canWrite = hasRole(...WRITE);
  const [c, setC] = useState<Contract | null>(null);
  const [appendices, setAppendices] = useState<Appendix[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [apOpen, setApOpen] = useState(false);

  function load() {
    setLoading(true);
    api.get<Contract>(`/contracts/${code}`)
      .then((d) => { setC(d); return api.get<Appendix[]>(`/contracts/${code}/appendices`); })
      .then(setAppendices)
      .catch((e) => setError(errMsg(e)))
      .finally(() => setLoading(false));
  }
  useEffect(load, [code]);

  async function act(path: string) {
    setError("");
    try { await api.post(`/contracts/${code}/${path}`, {}, crypto.randomUUID()); load(); }
    catch (e) { setError(errMsg(e)); }
  }

  if (loading) return <Spinner />;
  if (!c) return <ErrorBox message={error || "Không tìm thấy hợp đồng"} />;

  const editable = ["Draft", "RevisionRequested"].includes(c.status);
  const fmt = (n: number) => n.toLocaleString("vi-VN");

  return (
    <div>
      <PageHeader title={`Hợp đồng ${c.code}`} action={<StatusBadge status={c.status} />} />
      {error && <ErrorBox message={error} />}

      <div className="card grid grid-cols-2 gap-3 p-4 text-sm">
        <div><b>Khách hàng:</b> {c.customer_code}</div>
        <div><b>Giá trị:</b> {fmt(c.value)} đ</div>
        <div><b>Tiêu đề:</b> {c.title}</div>
        <div><b>Hiệu lực:</b> {c.effective_from || "—"} → {c.effective_to || "—"}</div>
        <div><b>Đính kèm tài liệu:</b> {c.has_attachment ? "Có" : "Chưa"}</div>
        <div><b>Người tạo:</b> {c.created_by || "—"}</div>
      </div>

      {canWrite && (
        <div className="mt-3 flex flex-wrap gap-2">
          {editable && <button className="btn-secondary" onClick={() => setEditing(true)}>Sửa</button>}
          {editable && <button className="btn-primary" onClick={() => act("submit")}>Gửi duyệt</button>}
          {c.status === "Approved" && <button className="btn-primary" onClick={() => act("activate")}>Kích hoạt</button>}
          {!["Expired", "Cancelled"].includes(c.status) &&
            <button className="btn-danger" onClick={() => act("cancel")}>Hủy</button>}
          {["Approved", "Active"].includes(c.status) &&
            <button className="btn-secondary" onClick={() => setApOpen(true)}>+ Phụ lục</button>}
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 gap-4">
        <div className="card p-4">
          <h3 className="mb-2 font-semibold">Tiến trình duyệt</h3>
          <ApprovalTimeline docType="CONTRACT" docId={code} />
        </div>
        <div className="card p-4">
          <h3 className="mb-2 font-semibold">Phụ lục ({appendices.length})</h3>
          {appendices.length === 0 ? <p className="text-sm text-slate-400">Chưa có phụ lục</p> :
            appendices.map((a) => (
              <div key={a.id} className="border-b border-slate-100 py-2 text-sm">
                <b>{a.title}</b> — hiệu lực {a.effective_date || "—"} <StatusBadge status={a.status} />
                {a.content && <div className="text-xs text-slate-500">{a.content}</div>}
              </div>
            ))}
        </div>
      </div>

      {editing && <EditModal contract={c} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); load(); }} />}
      {apOpen && <AppendixModal code={code} onClose={() => setApOpen(false)} onSaved={() => { setApOpen(false); load(); }} />}
    </div>
  );
}

function EditModal({ contract, onClose, onSaved }: { contract: Contract; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({
    title: contract.title, value: String(contract.value),
    effective_from: contract.effective_from || "", effective_to: contract.effective_to || "",
    has_attachment: contract.has_attachment || false,
  });
  const [err, setErr] = useState("");
  async function save() {
    setErr("");
    try {
      await api.put(`/contracts/${contract.code}`, {
        title: f.title, value: Number(f.value),
        effective_from: f.effective_from || null, effective_to: f.effective_to || null,
        has_attachment: f.has_attachment,
      });
      onSaved();
    } catch (e) { setErr(errMsg(e)); }
  }
  return (
    <Modal open title="Sửa hợp đồng" onClose={onClose}
      footer={<><button className="btn-secondary" onClick={onClose}>Hủy</button><button className="btn-primary" onClick={save}>Lưu</button></>}>
      <div className="space-y-3">
        {err && <ErrorBox message={err} />}
        <div><label className="mb-1 block text-xs font-medium">Tiêu đề</label>
          <input className="input" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></div>
        <div><label className="mb-1 block text-xs font-medium">Giá trị</label>
          <input className="input" type="number" value={f.value} onChange={(e) => setF({ ...f, value: e.target.value })} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="mb-1 block text-xs font-medium">Hiệu lực từ</label>
            <input className="input" type="date" value={f.effective_from} onChange={(e) => setF({ ...f, effective_from: e.target.value })} /></div>
          <div><label className="mb-1 block text-xs font-medium">Đến</label>
            <input className="input" type="date" value={f.effective_to} onChange={(e) => setF({ ...f, effective_to: e.target.value })} /></div>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={f.has_attachment} onChange={(e) => setF({ ...f, has_attachment: e.target.checked })} />
          Đã đính kèm tài liệu (bắt buộc trước khi gửi duyệt)
        </label>
      </div>
    </Modal>
  );
}

function AppendixModal({ code, onClose, onSaved }: { code: string; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({ title: "", content: "", effective_date: "" });
  const [err, setErr] = useState("");
  async function save() {
    setErr("");
    try {
      await api.post(`/contracts/${code}/appendices`, {
        title: f.title, content: f.content, effective_date: f.effective_date || null,
      }, crypto.randomUUID());
      onSaved();
    } catch (e) { setErr(errMsg(e)); }
  }
  return (
    <Modal open title="Thêm phụ lục" onClose={onClose}
      footer={<><button className="btn-secondary" onClick={onClose}>Hủy</button><button className="btn-primary" onClick={save}>Lưu</button></>}>
      <div className="space-y-3">
        {err && <ErrorBox message={err} />}
        <div><label className="mb-1 block text-xs font-medium">Tiêu đề *</label>
          <input className="input" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></div>
        <div><label className="mb-1 block text-xs font-medium">Nội dung</label>
          <textarea className="input" rows={3} value={f.content} onChange={(e) => setF({ ...f, content: e.target.value })} /></div>
        <div><label className="mb-1 block text-xs font-medium">Ngày hiệu lực</label>
          <input className="input" type="date" value={f.effective_date} onChange={(e) => setF({ ...f, effective_date: e.target.value })} /></div>
      </div>
    </Modal>
  );
}
