import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { api, clearTokens, setTokens } from "../api/client";
import type { AuthResult } from "../types";

interface AuthState {
  userId: string | null;
  fullName: string | null;
  roles: string[];
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  hasRole: (...r: string[]) => boolean;
}

const Ctx = createContext<AuthState>({} as AuthState);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [fullName, setFullName] = useState<string | null>(null);
  const [roles, setRoles] = useState<string[]>([]);

  useEffect(() => {
    if (localStorage.getItem("access_token")) {
      api.get("/auth/me")
        .then((me) => {
          setUserId(me.id);
          setFullName(me.full_name);
          setRoles(me.roles);
        })
        .catch(() => clearTokens());
    }
  }, []);

  async function login(username: string, password: string) {
    const res = await api.post<AuthResult>("/auth/login", { username, password });
    setTokens(res.access_token, res.refresh_token);
    setUserId(res.user_id);
    setFullName(res.full_name);
    setRoles(res.roles);
  }

  function logout() {
    api.post("/auth/logout").catch(() => {});
    clearTokens();
    setUserId(null);
    setRoles([]);
    window.location.href = "/login";
  }

  const hasRole = (...r: string[]) => r.some((x) => roles.includes(x));

  return (
    <Ctx.Provider value={{ userId, fullName, roles, login, logout, hasRole }}>
      {children}
    </Ctx.Provider>
  );
}
