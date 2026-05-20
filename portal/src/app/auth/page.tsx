"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Mode = "login" | "register";

export default function AuthPage() {
  const [mode, setMode] = useState<Mode>("login");
  const [form, setForm] = useState({ email: "", password: "", full_name: "", role: "gis_analyst" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const path = mode === "login" ? "/auth/login" : "/auth/register";
      const body = mode === "login"
        ? { email: form.email, password: form.password }
        : { email: form.email, password: form.password, full_name: form.full_name, role: form.role };

      const res = await fetch(`${API}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Authentication failed");
      localStorage.setItem("gc_token", data.token);
      localStorage.setItem("gc_user", JSON.stringify(data.user));
      router.push("/portal");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const ROLES = [
    { value: "field_collector",  label: "Field Collector" },
    { value: "project_manager",  label: "Project Manager" },
    { value: "gis_analyst",      label: "GIS Analyst" },
    { value: "platform_admin",   label: "Platform Admin" },
  ];

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      background: "linear-gradient(135deg, #0d1b2a 0%, #1a3a5c 50%, #0d1b2a 100%)",
      fontFamily: "'Inter', -apple-system, sans-serif",
    }}>
      {/* Left panel — branding */}
      <div style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "60px 64px",
        color: "#fff",
        maxWidth: 520,
      }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 48 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: "linear-gradient(135deg, #0079c1, #00b4d8)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="2" y1="12" x2="22" y2="12"/>
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
            </svg>
          </div>
          <span style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.3px" }}>GeoCollect</span>
        </div>

        <h1 style={{ fontSize: 36, fontWeight: 800, lineHeight: 1.2, marginBottom: 16, letterSpacing: "-0.5px" }}>
          Open-architecture<br/>geospatial platform
        </h1>
        <p style={{ fontSize: 16, color: "rgba(255,255,255,0.65)", lineHeight: 1.7, marginBottom: 40 }}>
          Collect, manage, analyze, and share spatial data — without the ArcGIS ceiling.
          Built for GIS professionals at Popson Geospatial.
        </p>

        {/* Feature list */}
        {[
          "Design forms with full geospatial field types",
          "Collect data offline with automatic sync",
          "Publish feature layers & web maps instantly",
          "Monitor submissions via real-time dashboards",
        ].map(f => (
          <div key={f} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <div style={{
              width: 20, height: 20, borderRadius: "50%",
              background: "rgba(0,180,216,0.2)",
              border: "1px solid rgba(0,180,216,0.5)",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="#00b4d8" strokeWidth="2">
                <polyline points="2,6 5,9 10,3"/>
              </svg>
            </div>
            <span style={{ fontSize: 14, color: "rgba(255,255,255,0.75)" }}>{f}</span>
          </div>
        ))}

        <div style={{ marginTop: 48, fontSize: 12, color: "rgba(255,255,255,0.3)" }}>
          © 2026 Popson Geospatial Service · All rights reserved
        </div>
      </div>

      {/* Right panel — form */}
      <div style={{
        width: 480,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 48px",
        background: "rgba(255,255,255,0.97)",
        backdropFilter: "blur(20px)",
      }}>
        <div style={{ width: "100%", maxWidth: 380 }}>
          {/* Tab toggle */}
          <div style={{
            display: "flex",
            background: "#f1f5f9",
            borderRadius: 10,
            padding: 4,
            marginBottom: 28,
          }}>
            {(["login", "register"] as Mode[]).map(m => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(""); }}
                style={{
                  flex: 1, padding: "9px 0", borderRadius: 7, border: "none", cursor: "pointer",
                  fontSize: 14, fontWeight: 600, transition: "all 0.15s",
                  background: mode === m ? "#fff" : "transparent",
                  color: mode === m ? "#0f172a" : "#64748b",
                  boxShadow: mode === m ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
                }}
              >
                {m === "login" ? "Sign In" : "Create Account"}
              </button>
            ))}
          </div>

          <h2 style={{ fontSize: 22, fontWeight: 700, color: "#0f172a", marginBottom: 6 }}>
            {mode === "login" ? "Welcome back" : "Join GeoCollect"}
          </h2>
          <p style={{ fontSize: 13, color: "#64748b", marginBottom: 24 }}>
            {mode === "login"
              ? "Sign in to your Popson Geospatial account"
              : "Create your account to get started"}
          </p>

          <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {mode === "register" && (
              <div>
                <label style={labelStyle}>Full Name</label>
                <input
                  style={inputStyle}
                  type="text" placeholder="e.g. Faridat Adesina" required
                  value={form.full_name}
                  onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                />
              </div>
            )}

            <div>
              <label style={labelStyle}>Email Address</label>
              <input
                style={inputStyle}
                type="email" placeholder="you@popsongeospatial.com" required
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              />
            </div>

            <div>
              <label style={labelStyle}>Password</label>
              <input
                style={inputStyle}
                type="password" placeholder="••••••••" required minLength={8}
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              />
            </div>

            {mode === "register" && (
              <div>
                <label style={labelStyle}>Role</label>
                <select
                  style={{ ...inputStyle, cursor: "pointer" }}
                  value={form.role}
                  onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                >
                  {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
            )}

            {error && (
              <div style={{
                background: "#fef2f2", border: "1px solid #fecaca",
                borderRadius: 8, padding: "10px 14px",
                fontSize: 13, color: "#dc2626",
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                padding: "12px 0", borderRadius: 9, border: "none", cursor: loading ? "not-allowed" : "pointer",
                background: loading ? "#94a3b8" : "linear-gradient(135deg, #0079c1, #0099e6)",
                color: "#fff", fontSize: 15, fontWeight: 600,
                boxShadow: loading ? "none" : "0 2px 8px rgba(0,121,193,0.35)",
                transition: "all 0.15s",
                marginTop: 4,
              }}
            >
              {loading ? "Please wait…" : mode === "login" ? "Sign In →" : "Create Account →"}
            </button>
          </form>

          {mode === "login" && (
            <p style={{ textAlign: "center", fontSize: 12, color: "#94a3b8", marginTop: 20 }}>
              Forgot your password?{" "}
              <span style={{ color: "#0079c1", cursor: "pointer", fontWeight: 500 }}>Reset it</span>
            </p>
          )}

          <div style={{ marginTop: 24, paddingTop: 20, borderTop: "1px solid #f1f5f9", textAlign: "center" }}>
            <Link href="/portal" style={{ fontSize: 12, color: "#94a3b8", textDecoration: "none" }}>
              ← Back to Portal
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: 12, fontWeight: 600,
  color: "#374151", marginBottom: 5,
};

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 12px",
  border: "1.5px solid #e2e8f0", borderRadius: 8,
  fontSize: 14, color: "#0f172a", outline: "none",
  background: "#fafafa", boxSizing: "border-box",
  transition: "border-color 0.15s",
};
