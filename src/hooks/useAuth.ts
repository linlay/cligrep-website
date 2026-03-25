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

function buildLoginURL() {
  return "/api/v1/auth/google/start";
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(() => readStoredUser());
  const [authChecked, setAuthChecked] = useState(false);

  const activeUser = user ?? ANONYMOUS_FALLBACK;
  const isAnonymous = !user || activeUser.username === "anonymous";

  useEffect(() => {
    if (user) {
      localStorage.setItem("cligrep-user", JSON.stringify(user));
    } else {
      localStorage.removeItem("cligrep-user");
    }
  }, [user]);

  useEffect(() => {
    let cancelled = false;

    async function loadSessionUser() {
      try {
        const payload = await request<{ user: User }>("/api/v1/auth/me");
        if (!cancelled) {
          setUser(payload.user);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (!cancelled && /401/.test(message) === false && /unauthorized/i.test(message) === false) {
          setUser(null);
        }
        if (!cancelled && (/401/.test(message) || /unauthorized/i.test(message))) {
          setUser(null);
        }
      } finally {
        if (!cancelled) {
          setAuthChecked(true);
        }
      }
    }

    void loadSessionUser();

    return () => {
      cancelled = true;
    };
  }, []);

  function login(): void {
    window.location.assign(buildLoginURL());
  }

  async function logout(): Promise<void> {
    await request("/api/v1/auth/logout", { method: "POST" });
    setUser(null);
  }

  return { user, setUser, activeUser, isAnonymous, authChecked, login, logout };
}
