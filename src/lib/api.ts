const RAW_API_BASE = import.meta.env.VITE_API_BASE ?? "";
const API_BASE = RAW_API_BASE.replace(/\/+$/, "");

function resolveRequestPath(path: string): string {
  if (path.startsWith("/api") || path.startsWith("/healthz")) {
    return path;
  }
  if (!API_BASE) {
    return path;
  }
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE}${normalizedPath}`;
}

export async function request<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers ?? undefined);
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(resolveRequestPath(path), {
    credentials: "include",
    headers,
    ...options,
  });

  const payload = (await response.json().catch(() => ({}))) as { error?: string } & T;
  if (!response.ok) {
    throw new Error(payload.error || `Request failed with status ${response.status}`);
  }
  return payload;
}
