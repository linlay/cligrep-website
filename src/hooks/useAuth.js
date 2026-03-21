import { useEffect, useState } from "react";
import { request } from "../lib/api.js";
import { ANONYMOUS_FALLBACK } from "../lib/constants.js";

export function useAuth() {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem("cligrep-user");
    return raw ? JSON.parse(raw) : null;
  });

  const activeUser = user ?? ANONYMOUS_FALLBACK;
  const isAnonymous = activeUser.username === "anonymous";

  useEffect(() => {
    if (user) {
      localStorage.setItem("cligrep-user", JSON.stringify(user));
    } else {
      localStorage.removeItem("cligrep-user");
    }
  }, [user]);

  async function ensureAnonymousSession() {
    try {
      const payload = await request("/api/v1/auth/mock/anonymous", { method: "POST" });
      setUser(payload.user);
      return payload.user;
    } catch {
      return null;
    }
  }

  async function login(username) {
    const payload = await request("/api/v1/auth/mock/login", {
      method: "POST",
      body: JSON.stringify({ username: username || "operator" }),
    });
    setUser(payload.user);
    return payload.user;
  }

  async function logout() {
    await request("/api/v1/auth/mock/logout", { method: "POST" });
    const u = await ensureAnonymousSession();
    return u;
  }

  return { user, setUser, activeUser, isAnonymous, ensureAnonymousSession, login, logout };
}
