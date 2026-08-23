import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ApiError } from "../api/client";

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [username, setUsername] = useState("sale01");
  const [password, setPassword] = useState("pass123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(username, password);
      nav("/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Đăng nhập thất bại");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100">
      <form onSubmit={submit} className="card w-80 p-6">
        <h1 className="mb-1 text-xl font-bold text-primary">Quản trị Kinh doanh</h1>
        <p className="mb-4 text-xs text-slate-500">Đăng nhập hệ thống</p>
        {error && <div className="mb-3 rounded bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>}
        <label className="mb-1 block text-xs font-medium">Tài khoản</label>
        <input className="input mb-3" value={username} onChange={(e) => setUsername(e.target.value)} />
        <label className="mb-1 block text-xs font-medium">Mật khẩu</label>
        <input type="password" className="input mb-4" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button className="btn-primary w-full justify-center" disabled={loading}>
          {loading ? "Đang đăng nhập..." : "Đăng nhập"}
        </button>
        <p className="mt-3 text-center text-[11px] text-slate-400">
          demo: sale01 / manager01 / director01 … · mật khẩu pass123
        </p>
      </form>
    </div>
  );
}
