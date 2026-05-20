"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AuthPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [form, setForm] = useState({ email: "", password: "", full_name: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const path = mode === "login" ? "/auth/login" : "/auth/register";
      const res = await fetch(`${API}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      localStorage.setItem("gc_token", data.token);
      localStorage.setItem("gc_user", JSON.stringify(data.user));
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 to-blue-50">
      <div className="card w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center mx-auto mb-3">
            <span className="text-white text-xl font-bold">G</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800">GeoCollect Studio</h1>
          <p className="text-sm text-slate-500 mt-1">{mode === "login" ? "Sign in to your account" : "Create your account"}</p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          {mode === "register" && (
            <div>
              <label className="label">Full Name</label>
              <input className="input" type="text" placeholder="Jane Smith" required
                value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
            </div>
          )}
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" placeholder="you@example.com" required
              value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          </div>
          <div>
            <label className="label">Password</label>
            <input className="input" type="password" placeholder="••••••••" required minLength={8}
              value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
          </div>
          {error && <p className="text-sm text-geo-red bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          <button className="btn-primary w-full justify-center py-2.5" disabled={loading}>
            {loading ? "Please wait…" : mode === "login" ? "Sign In" : "Create Account"}
          </button>
        </form>
        <p className="text-center text-sm text-slate-500 mt-6">
          {mode === "login" ? "No account?" : "Already have one?"}
          <button onClick={() => setMode(m => m === "login" ? "register" : "login")}
            className="text-primary font-medium ml-1 hover:underline">
            {mode === "login" ? "Register" : "Sign in"}
          </button>
        </p>
      </div>
    </div>
  );
}
