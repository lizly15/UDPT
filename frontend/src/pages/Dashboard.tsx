import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { AppNotification, Contract, Task } from "../types";

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="card p-4">
      <div className="text-2xl font-bold text-primary">{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
}

export default function Dashboard() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [notifs, setNotifs] = useState<AppNotification[]>([]);

  useEffect(() => {
    api.get<Contract[]>("/contracts").then(setContracts).catch(() => {});
    api.get<Task[]>("/tasks/inbox").then(setTasks).catch(() => {});
    api.get<AppNotification[]>("/notifications").then(setNotifs).catch(() => {});
  }, []);

  const active = contracts.filter((c) => c.status === "Active").length;

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">Tổng quan</h1>
      <div className="grid grid-cols-4 gap-4">
        <Stat label="Tổng hợp đồng" value={contracts.length} />
        <Stat label="Hợp đồng Active" value={active} />
        <Stat label="Hồ sơ chờ tôi duyệt" value={tasks.length} />
        <Stat label="Thông báo" value={notifs.length} />
      </div>
      <div className="mt-6 card p-4">
        <h2 className="mb-2 font-semibold">Thông báo gần đây</h2>
        {notifs.slice(0, 5).map((n) => (
          <div key={n.id} className="border-b border-slate-100 py-2 text-sm">
            <b>{n.title}</b> — {n.body}
          </div>
        ))}
        {notifs.length === 0 && <p className="text-sm text-slate-400">Chưa có thông báo</p>}
      </div>
    </div>
  );
}
