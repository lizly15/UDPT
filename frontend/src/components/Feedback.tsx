// Component chung (đóng băng). Spinner + trạng thái rỗng + báo lỗi.
export function Spinner() {
  return <div className="py-6 text-center text-sm text-slate-400">Đang tải…</div>;
}
export function EmptyState({ text = "Chưa có dữ liệu" }: { text?: string }) {
  return <div className="card p-6 text-center text-sm text-slate-400">{text}</div>;
}
export function ErrorBox({ message }: { message: string }) {
  return <div className="rounded bg-red-50 px-3 py-2 text-xs text-red-700">{message}</div>;
}
