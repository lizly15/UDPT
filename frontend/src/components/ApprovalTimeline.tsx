// Component chung (đóng băng). Hiển thị timeline các bước duyệt của 1 hồ sơ.
// Dùng: <ApprovalTimeline docType="CONTRACT" docId={code} /> — tự gọi /workflows/by-doc.
import { useEffect, useState } from "react";
import { api } from "../api/client";
import StatusBadge from "./StatusBadge";
import type { WorkflowInstance } from "../types/workflow";

export default function ApprovalTimeline({ docType, docId }: { docType: string; docId: string }) {
  const [inst, setInst] = useState<WorkflowInstance | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    api.get<WorkflowInstance>(`/workflows/by-doc/${docType}/${docId}`)
      .then(setInst).catch(() => setErr(true));
  }, [docType, docId]);

  if (err) return <p className="text-sm text-slate-400">Hồ sơ chưa được gửi duyệt.</p>;
  if (!inst) return <p className="text-sm text-slate-400">Đang tải…</p>;

  return (
    <div className="space-y-2">
      <div className="text-sm">Trạng thái quy trình: <StatusBadge status={inst.status} /></div>
      <ol className="relative border-l border-slate-200 pl-4">
        {inst.tasks.map((t) => {
          const current = t.step_order === inst.current_step_order && inst.status === "in_progress";
          return (
            <li key={t.id} className="mb-3">
              <span className={`absolute -left-[7px] h-3 w-3 rounded-full ${
                t.status === "approved" ? "bg-green-500" :
                t.status === "rejected" ? "bg-red-500" :
                current ? "bg-amber-500" : "bg-slate-300"}`} />
              <div className="text-sm font-medium">{t.step_order}. {t.step_name}</div>
              <div className="text-xs text-slate-500">
                Người duyệt: {t.assignee_username} · <StatusBadge status={t.status} />
                {t.comment && <> · “{t.comment}”</>}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
