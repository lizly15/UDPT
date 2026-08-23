import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const NAV = [
  { to: "/", label: "Tổng quan", roles: [] },
  { to: "/customers", label: "Khách hàng", roles: [] },
  { to: "/services", label: "Dịch vụ", roles: [] },
  { to: "/contracts", label: "Hợp đồng", roles: [] },
  { to: "/pricing", label: "Bảng giá", roles: [] },
  { to: "/volumes", label: "Sản lượng", roles: [] },
  { to: "/payments", label: "Bảng thanh toán", roles: [] },
  { to: "/inbox", label: "Chờ tôi duyệt", roles: [] },
  { to: "/notifications", label: "Thông báo", roles: [] },
  { to: "/audit", label: "Nhật ký", roles: ["ADMIN", "DIRECTOR", "ACCOUNTANT"] },
  { to: "/admin", label: "Quản trị", roles: ["ADMIN"] },
];

export default function Layout() {
  const { fullName, roles, logout, hasRole } = useAuth();
  return (
    <div className="flex min-h-screen">
      <aside className="w-56 shrink-0 bg-primary text-white">
        <div className="px-4 py-4 text-lg font-bold">QTKD Logistics</div>
        <nav className="flex flex-col gap-0.5 px-2">
          {NAV.filter((n) => n.roles.length === 0 || hasRole(...n.roles)).map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === "/"}
              className={({ isActive }) =>
                `rounded px-3 py-2 text-sm ${isActive ? "bg-white/20 font-medium" : "hover:bg-white/10"}`
              }
            >
              {n.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
          <div className="text-sm text-slate-500">Hệ thống Quản trị Kinh doanh</div>
          <div className="flex items-center gap-3">
            <span className="text-sm">
              {fullName} <span className="text-slate-400">({roles.join(", ")})</span>
            </span>
            <button className="btn-secondary" onClick={logout}>Đăng xuất</button>
          </div>
        </header>
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
