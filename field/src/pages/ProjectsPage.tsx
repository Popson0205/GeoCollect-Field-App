// field/src/pages/ProjectsPage.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { getAuth, clearAuth, saveFormOffline } from "../lib/db";
import { syncPendingFeatures } from "../lib/sync";

interface Project {
  id: string;
  name: string;
  description?: string;
  status: string;
  form_count?: number;
}

// IMPORTANT: geofence must be included here so it is persisted to IndexedDB
// via saveFormOffline and is available to CollectPage when offline.
interface GeofencePolygon {
  type: "Polygon";
  coordinates: [number, number][][];
}

interface FormSchema {
  id: string;
  name: string;
  geometry_type: string;
  is_published: boolean;
  schema: { fields: unknown[] };
  geofence?: GeofencePolygon | null;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [user, setUser]         = useState<{ full_name: string } | null>(null);
  const [syncing, setSyncing]   = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [forms, setForms]       = useState<Record<string, FormSchema[]>>({});
  const nav = useNavigate();

  useEffect(() => {
    getAuth().then(({ token, user }) => {
      if (!token) { nav("/auth"); return; }
      setUser(user as { full_name: string });
    });
    apiFetch<Project[]>("/projects").then(setProjects).catch(() => nav("/auth"));
  }, [nav]);

  const expandProject = async (pid: string) => {
    setExpanded(p => p === pid ? null : pid);
    if (!forms[pid]) {
      const fs = await apiFetch<FormSchema[]>(`/projects/${pid}/forms`);
      const published = fs.filter(f => f.is_published);
      // saveFormOffline stores the FULL form object including geofence
      for (const f of published) await saveFormOffline(f);
      setForms(prev => ({ ...prev, [pid]: published }));
    }
  };

  const sync = async () => {
    setSyncing(true); setSyncResult(null);
    const r = await syncPendingFeatures();
    setSyncResult(
      `Synced ${r.synced} feature${r.synced !== 1 ? "s" : ""}` +
      (r.failed > 0 ? `, ${r.failed} failed` : "")
    );
    setSyncing(false);
    setTimeout(() => setSyncResult(null), 3000);
  };

  const logout = async () => { await clearAuth(); nav("/auth"); };

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "16px 16px 80px" }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 20, paddingTop: 8,
      }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>GeoCollect Field</h1>
          {user && (
            <p style={{ fontSize: 12, color: "#64748b" }}>
              {(user as { full_name: string }).full_name}
            </p>
          )}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            className="btn btn-ghost"
            style={{ fontSize: 12, padding: "6px 12px" }}
            onClick={sync}
            disabled={syncing}
          >
            {syncing ? "Syncing…" : "⟳ Sync"}
          </button>
          <button
            className="btn btn-ghost"
            style={{ fontSize: 12, padding: "6px 12px" }}
            onClick={logout}
          >
            Sign out
          </button>
        </div>
      </div>

      {/* Sync result */}
      {syncResult && (
        <div style={{
          background: "#dcfce7", color: "#16a34a",
          padding: "8px 12px", borderRadius: 8,
          fontSize: 13, marginBottom: 12,
        }}>
          {syncResult}
        </div>
      )}

      {/* Offline banner */}
      {!navigator.onLine && (
        <div style={{
          background: "#ffedd5", color: "#ea580c",
          padding: "8px 12px", borderRadius: 8,
          fontSize: 13, marginBottom: 12,
        }}>
          📡 Offline — data will sync when connected
        </div>
      )}

      {/* Project list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {projects.map(p => (
          <div key={p.id} className="card">
            <div
              onClick={() => expandProject(p.id)}
              style={{
                padding: "14px 16px", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "space-between",
              }}
            >
              <div>
                <p style={{ fontWeight: 600, fontSize: 15 }}>{p.name}</p>
                <p style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                  {p.description || "No description"}
                </p>
              </div>
              <span style={{ fontSize: 18, color: "#94a3b8" }}>
                {expanded === p.id ? "▲" : "▼"}
              </span>
            </div>

            {expanded === p.id && (
              <div style={{ borderTop: "1px solid #e2e8f0", padding: "10px 16px 14px" }}>
                {(forms[p.id] || []).length === 0 ? (
                  <p style={{ fontSize: 13, color: "#94a3b8" }}>No published forms</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {(forms[p.id] || []).map(f => (
                      <button
                        key={f.id}
                        className="btn btn-primary"
                        style={{ justifyContent: "flex-start", width: "100%" }}
                        onClick={() => nav(`/collect/${p.id}/${f.id}`)}
                      >
                        📋 {f.name}
                        <span style={{ marginLeft: "auto", fontSize: 11, opacity: 0.8 }}>
                          {f.geometry_type}
                          {f.geofence ? " · 📍 Geofenced" : ""}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
