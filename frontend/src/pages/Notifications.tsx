// OWNER: FE-B · Module: Thông báo — MÀN MẪU HOẠT ĐỘNG (tham khảo pattern cho các màn FE-B khác)
import { useEffect, useState } from "react";
import { api, errMsg } from "../api/client";
import PageHeader from "../components/PageHeader";
import { EmptyState, ErrorBox, Spinner } from "../components/Feedback";
import type { AppNotification } from "../types/notification";

export default function Notifications() {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  function load() {
    setLoading(true);
    api.get<AppNotification[]>("/notifications")
      .then(setItems).catch((e) => setError(errMsg(e))).finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function markRead(id: string) {
    try { await api.post(`/notifications/${id}/read`); load(); }
    catch (e) { setError(errMsg(e)); }
  }

  return (
    <div>
      <PageHeader title="Thông báo" />
      {error && <ErrorBox message={error} />}
      {loading ? <Spinner /> : items.length === 0 ? <EmptyState text="Không có thông báo" /> : (
        <div className="card divide-y divide-slate-100">
          {items.map((n) => (
            <div key={n.id} className={`flex items-center justify-between p-3 ${n.is_read ? "opacity-60" : ""}`}>
              <div>
                <div className="text-sm font-medium">{n.title}</div>
                <div className="text-xs text-slate-500">{n.body} · {new Date(n.created_at).toLocaleString("vi-VN")}</div>
              </div>
              {!n.is_read && <button className="btn-secondary" onClick={() => markRead(n.id)}>Đã đọc</button>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
