import { getAuth } from "./db";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const { token } = await getAuth();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || "Request failed");
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}
