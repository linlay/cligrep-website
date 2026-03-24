import type { ThemeOption, User } from "../types";

export const BUILTIN_PREFIXES = ["grep", "help", "clear", "login", "logout", "create", "make", "theme", "lang"] as const;
export const THEME_OPTIONS: readonly ThemeOption[] = ["system", "dark", "light"];
export const ANONYMOUS_FALLBACK: User = { username: "anonymous", ip: "10.24.218.46" };

export const TAB_COMPLETIONS = ["grep", "help", "clear", "login", "logout", "create", "make", "theme", "lang"] as const;

export const MAX_HISTORY_BUFFER = 200;
