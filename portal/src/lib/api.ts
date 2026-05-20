// ── GeoCollect Portal — API Client ───────────────────────────
import useSWR from "swr";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

// ── Auth helpers ─────────────────────────────────────────────
export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("gc_token");
}

export function setToken(token: string) {
  localStorage.setItem("gc_token", token);
}

export function clearToken() {
  localStorage.removeItem("gc_token");
  localStorage.removeItem("gc_user");
}

export function getUser() {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("gc_user");
  return raw ? JSON.parse(raw) : null;
}

// ── Base fetcher ─────────────────────────────────────────────
async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? "API error");
  }
  return res.json();
}

// ── SWR fetcher ──────────────────────────────────────────────
export const fetcher = (url: string) => apiFetch(url);

// ── Auth ─────────────────────────────────────────────────────
export async function login(username: string, password: string) {
  const data = await apiFetch<{ token: string; user: Record<string, unknown> }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
  setToken(data.token);
  localStorage.setItem("gc_user", JSON.stringify(data.user));
  return data;
}

export async function logout() {
  clearToken();
}

// ── Forms ────────────────────────────────────────────────────
export const useForms = () => useSWR("/forms", fetcher);
export const useForm  = (id: string) => useSWR(id ? `/forms/${id}` : null, fetcher);

export const createForm = (data: Record<string, unknown>) =>
  apiFetch("/forms", { method: "POST", body: JSON.stringify(data) });

export const updateForm = (id: string, data: Record<string, unknown>) =>
  apiFetch(`/forms/${id}`, { method: "PUT", body: JSON.stringify(data) });

export const deleteForm = (id: string) =>
  apiFetch(`/forms/${id}`, { method: "DELETE" });

export const publishForm = (id: string) =>
  apiFetch(`/forms/${id}/publish`, { method: "POST" });

// ── Features ─────────────────────────────────────────────────
export const useFeatures = (formId: string) =>
  useSWR(formId ? `/features?form_id=${formId}` : null, fetcher);

export const createFeature = (data: Record<string, unknown>) =>
  apiFetch("/features", { method: "POST", body: JSON.stringify(data) });

// ── Projects ─────────────────────────────────────────────────
export const useProjects = () => useSWR("/projects", fetcher);
export const useProject  = (id: string) => useSWR(id ? `/projects/${id}` : null, fetcher);

// ── Attachments ──────────────────────────────────────────────
export async function uploadAttachment(featureId: string, file: File) {
  const token = getToken();
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`${API_BASE}/attachments?feature_id=${featureId}`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: fd,
  });
  if (!res.ok) throw new Error("Upload failed");
  return res.json();
}

// ── Portal config ─────────────────────────────────────────────
export const usePortalConfig = () => useSWR("/portal/config", fetcher);
