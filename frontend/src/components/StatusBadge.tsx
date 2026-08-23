const MAP: Record<string, string> = {
  Draft: "bg-slate-200 text-slate-600",
  Submitted: "bg-amber-100 text-amber-800",
  Signing: "bg-amber-100 text-amber-800",
  in_progress: "bg-amber-100 text-amber-800",
  Approved: "bg-green-100 text-green-800",
  Effective: "bg-green-100 text-green-800",
  Active: "bg-green-100 text-green-800",
  approved: "bg-green-100 text-green-800",
  Signed: "bg-blue-100 text-blue-800",
  Issued: "bg-blue-100 text-blue-800",
  Rejected: "bg-red-100 text-red-800",
  SignFailed: "bg-red-100 text-red-800",
  Cancelled: "bg-red-100 text-red-800",
  rejected: "bg-red-100 text-red-800",
  RevisionRequested: "bg-orange-100 text-orange-800",
  Superseded: "bg-orange-100 text-orange-800",
};

export default function StatusBadge({ status }: { status: string }) {
  const cls = MAP[status] || "bg-slate-100 text-slate-600";
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>{status}</span>
  );
}
