const RAW_API_BASE = import.meta.env.VITE_API_BASE ?? "";
const API_BASE = RAW_API_BASE.replace(/\/+$/, "");

function resolveRequestPath(path) {
  if (path.startsWith("/api") || path.startsWith("/healthz")) {
    return path;
  }
  if (!API_BASE) {
    return path;
  }
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE}${normalizedPath}`;
}

export async function request(path, options = {}) {
  const response = await fetch(resolveRequestPath(path), {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
    ...options,
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || `Request failed with status ${response.status}`);
  }
  return payload;
}
