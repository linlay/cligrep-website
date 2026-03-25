import type { User } from "../types";

export function displayIdentity(user: User): string {
  const displayName = String(user.displayName ?? "").trim();
  if (displayName) {
    return displayName;
  }
  return String(user.username ?? "").trim() || "anonymous";
}
