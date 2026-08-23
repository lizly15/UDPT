// Component chung (đóng băng). Bảng dữ liệu đơn giản.
// columns: [{ key, label, render? }]. rows: mảng object.
import { ReactNode } from "react";

export interface Column<T> {
  key: string;
  label: string;
  render?: (row: T) => ReactNode;
}

export default function DataTable<T extends Record<string, any>>({
  columns, rows, empty = "Chưa có dữ liệu", onRowClick,
}: {
  columns: Column<T>[]; rows: T[]; empty?: string; onRowClick?: (row: T) => void;
}) {
  return (
    <table className="card w-full overflow-hidden text-sm">
      <thead>
        <tr>{columns.map((c) => <th key={c.key} className="th">{c.label}</th>)}</tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} className={onRowClick ? "cursor-pointer hover:bg-slate-50" : ""}
              onClick={() => onRowClick?.(row)}>
            {columns.map((c) => (
              <td key={c.key} className="td">{c.render ? c.render(row) : String(row[c.key] ?? "")}</td>
            ))}
          </tr>
        ))}
        {rows.length === 0 && (
          <tr><td className="td text-slate-400" colSpan={columns.length}>{empty}</td></tr>
        )}
      </tbody>
    </table>
  );
}
