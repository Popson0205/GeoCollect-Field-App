import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { saveAuth } from "../lib/db";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

export default function AuthPage() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");
      await saveAuth(data.token, data.user);
      nav("/projects");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg,#eff6ff,#f8fafc)" }}>
      <div className="card" style={{ width: "100%", maxWidth: 380, padding: 32 }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ width: 48, height: 48, background: "#2563eb", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px", color: "#fff", fontSize: 22, fontWeight: 700 }}>G</div>
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>GeoCollect Field</h1>
          <p style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>Sign in to start collecting</p>
        </div>
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" required placeholder="you@example.com"
              value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          </div>
          <div>
            <label className="label">Password</label>
            <input className="input" type="password" required
              value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
          </div>
          {error && <p style={{ fontSize: 13, color: "#dc2626", background: "#fef2f2", padding: "8px 12px", borderRadius: 8 }}>{error}</p>}
          <button className="btn btn-primary" style={{ justifyContent: "center", padding: "10px 16px" }} disabled={loading}>
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
