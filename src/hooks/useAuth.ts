import { useEffect, useState } from "react";
import { request } from "../lib/api";
import { ANONYMOUS_FALLBACK } from "../lib/constants";
import type { User } from "../types";

function readStoredUser(): User | null {
  try {
    const raw = localStorage.getItem("cligrep-user");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as User;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(() => readStoredUser());

  const activeUser = user ?? ANONYMOUS_FALLBACK;
  const isAnonymous = activeUser.username === "anonymous";

  useEffect(() => {
    if (user) {
      localStorage.setItem("cligrep-user", JSON.stringify(user));
    } else {
      localStorage.removeItem("cligrep-user");
    }
  }, [user]);

  async function ensureAnonymousSession(): Promise<User | null> {
    try {
      const payload = await request<{ user: User }>("/api/v1/auth/mock/anonymous", { method: "POST" });
      setUser(payload.user);
      return payload.user;
    } catch {
      return null;
    }
  }

  async function login(username: string): Promise<User> {
    const payload = await request<{ user: User }>("/api/v1/auth/mock/login", {
      method: "POST",
      body: JSON.stringify({ username: username || "operator" }),
    });
    setUser(payload.user);
    return payload.user;
  }

  async function logout(): Promise<User | null> {
    await request("/api/v1/auth/mock/logout", { method: "POST" });
    const u = await ensureAnonymousSession();
    return u;
  }

  return { user, setUser, activeUser, isAnonymous, ensureAnonymousSession, login, logout };
}
