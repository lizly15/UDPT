// Component chung (đóng băng). Tiêu đề trang + nút hành động bên phải.
import { ReactNode } from "react";

export default function PageHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h1 className="text-xl font-bold">{title}</h1>
      {action}
    </div>
  );
}
