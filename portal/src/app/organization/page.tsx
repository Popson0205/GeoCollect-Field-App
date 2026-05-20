"use client";
import { useState } from "react";
import TopNav from "@/components/TopNav";
import { Users, Settings, Shield, CreditCard, BarChart2, Plus, Search, MoreHorizontal, Mail, CheckCircle2 } from "lucide-react";

type OrgTab = "overview"|"members"|"licenses"|"status"|"settings";

const NAV: { id:OrgTab; label:string; icon:React.ReactNode }[] = [
  { id:"overview",  label:"Overview",  icon:<BarChart2 size={14}/> },
  { id:"members",   label:"Members",   icon:<Users size={14}/> },
  { id:"licenses",  label:"Licenses",  icon:<CreditCard size={14}/> },
  { id:"status",    label:"Status",    icon:<Shield size={14}/> },
  { id:"settings",  label:"Settings",  icon:<Settings size={14}/> },
];

const MEMBERS = [
  { id:"u1", name:"Faridat Adesina",   username:"faridat_a",   role:"Administrator",   email:"adebayoilias44@gmail.com", lastLogin:"Apr 17, 2026", status:"active" },
  { id:"u2", name:"Field Collector 1", username:"collector1",  role:"Field Collector", email:"collector1@geocollect.io",  lastLogin:"Apr 16, 2026", status:"active" },
  { id:"u3", name:"GIS Analyst",       username:"gis_analyst", role:"GIS Analyst",     email:"analyst@geocollect.io",     lastLogin:"Apr 15, 2026", status:"active" },
  { id:"u4", name:"Project Manager",   username:"pm_1",        role:"Project Manager", email:"pm@geocollect.io",          lastLogin:"Apr 10, 2026", status:"inactive" },
];
const ROLE_COLORS: Record<string,string> = {
  "Administrator":   "gc-badge-org",
  "GIS Analyst":     "gc-badge-shared",
  "Field Collector": "gc-badge-private",
  "Project Manager": "gc-badge-public",
};
const SERVICES = [
  ["API Service (port 3001)","Operational"],
  ["Geo API (port 3002)","Operational"],
  ["GeoServer (port 8080)","Operational"],
  ["PostgreSQL + PostGIS","Operational"],
  ["Redis","Operational"],
  ["MinIO Object Storage","Operational"],
  ["WebSocket Server","Operational"],
];

export default function OrganizationPage() {
  const [tab,          setTab]          = useState<OrgTab>("overview");
  const [query,        setQuery]        = useState("");
  const [saved,        setSaved]        = useState(false);
  const [resetConfirm, setResetConfirm] = useState(false);
  const [resetStatus,  setResetStatus]  = useState<"idle"|"loading"|"done"|"error">("idle");
  const [resetMsg,     setResetMsg]     = useState("");

  const filtered = MEMBERS.filter(m =>
    m.name.toLowerCase().includes(query.toLowerCase()) ||
    m.email.toLowerCase().includes(query.toLowerCase())
  );

  const save = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };

  const handleReset = async () => {
    setResetStatus("loading");
    setResetMsg("");
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("gc_token") : null;
      const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
      const res = await fetch(`${API}/portal/admin/reset-data?confirm=WIPE_ALL_DATA`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Reset failed");
      setResetStatus("done");
      setResetMsg(`Wiped: ${data.deleted.features} features, ${data.deleted.attachments} attachments, ${data.deleted.audit_log} audit records.`);
      setResetConfirm(false);
    } catch (err: unknown) {
      setResetStatus("error");
      setResetMsg(err instanceof Error ? err.message : "Reset failed");
    }
  };

  return (
    <div className="gc-page" style={{ height:"100vh", overflow:"hidden" }}>
      <TopNav/>
      <div className="gc-org">
        {/* Sidebar */}
        <div className="gc-org-sidebar">
          <div className="gc-org-sidebar-hdr">
            <div className="gc-org-sidebar-title">Popson Geospatial</div>
            <div className="gc-org-sidebar-sub">Organization Settings</div>
          </div>
          {NAV.map(n => (
            <div key={n.id} className={`gc-org-nav-item ${tab===n.id ? "active" : ""}`} onClick={() => setTab(n.id)}>
              {n.icon} {n.label}
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="gc-org-content">

          {/* OVERVIEW */}
          {tab === "overview" && (
            <div>
              <h2 style={{ fontSize:16, fontWeight:600, marginBottom:16 }}>Organization Overview</h2>
              <div className="gc-org-stats">
                {[["4","Members"],["8","Content Items"],["2","Groups"],["1.2 GB","Storage Used"]].map(([n,l]) => (
                  <div key={l} className="gc-org-stat"><div className="gc-org-stat-num">{n}</div><div className="gc-org-stat-label">{l}</div></div>
                ))}
              </div>
              <div className="gc-card" style={{ padding:18, marginBottom:16 }}>
                <div style={{ fontWeight:600, fontSize:13, marginBottom:12 }}>Storage</div>
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:"var(--c-text-3)", marginBottom:6 }}>
                  <span>1.2 GB used</span><span>10 GB total</span>
                </div>
                <div className="gc-progress-bar"><div className="gc-progress-fill" style={{ width:"12%" }}/></div>
                <div style={{ fontSize:11, color:"var(--c-text-4)", marginTop:5 }}>12% of storage used</div>
              </div>
              <div className="gc-card" style={{ padding:18, marginBottom:16 }}>
                <div style={{ fontWeight:600, fontSize:13, marginBottom:12 }}>Credits</div>
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:"var(--c-text-3)", marginBottom:6 }}>
                  <span>450 credits used</span><span>1,000 total</span>
                </div>
                <div className="gc-progress-bar"><div className="gc-progress-fill" style={{ width:"45%", background:"#e65100" }}/></div>
                <div style={{ fontSize:11, color:"var(--c-text-4)", marginTop:5 }}>45% of credits used</div>
              </div>
              <div className="gc-card" style={{ overflow:"hidden" }}>
                <div style={{ padding:"12px 16px", fontWeight:600, fontSize:13, borderBottom:"1px solid var(--c-border-light)" }}>Recent Members</div>
                {MEMBERS.slice(0,3).map(m => (
                  <div key={m.id} style={{ display:"flex", alignItems:"center", gap:11, padding:"10px 16px", borderBottom:"1px solid var(--c-border-light)" }}>
                    <div style={{ width:30, height:30, borderRadius:"50%", background:"var(--c-blue)", color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, flexShrink:0 }}>
                      {m.name.split(" ").map(w=>w[0]).join("").slice(0,2)}
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, fontWeight:500 }}>{m.name}</div>
                      <div style={{ fontSize:11, color:"var(--c-text-4)" }}>{m.role}</div>
                    </div>
                    <span className={`gc-badge ${ROLE_COLORS[m.role]}`} style={{ display:"inline-flex" }}>{m.role}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* MEMBERS */}
          {tab === "members" && (
            <div>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
                <h2 style={{ fontSize:16, fontWeight:600 }}>Members ({MEMBERS.length})</h2>
                <div style={{ display:"flex", gap:8 }}>
                  <div className="gc-search" style={{ maxWidth:220 }}>
                    <Search size={13}/>
                    <input className="gc-input" placeholder="Search members…" value={query} onChange={e => setQuery(e.target.value)}/>
                  </div>
                  <button className="gc-btn gc-btn-primary gc-btn-sm" style={{ gap:5 }}><Plus size={13}/><Mail size={13}/> Invite Member</button>
                </div>
              </div>
              <div className="gc-card" style={{ overflow:"hidden" }}>
                <table className="gc-table" style={{ borderRadius:0, border:"none", boxShadow:"none" }}>
                  <thead><tr><th>Member</th><th>Username</th><th>Role</th><th>Last Login</th><th>Status</th><th></th></tr></thead>
                  <tbody>
                    {filtered.map(m => (
                      <tr key={m.id}>
                        <td>
                          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                            <div style={{ width:30, height:30, borderRadius:"50%", background:"var(--c-blue)", color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, flexShrink:0 }}>
                              {m.name.split(" ").map(w=>w[0]).join("").slice(0,2)}
                            </div>
                            <div>
                              <div style={{ fontSize:13, fontWeight:500 }}>{m.name}</div>
                              <div style={{ fontSize:11, color:"var(--c-text-4)" }}>{m.email}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ fontSize:12, color:"var(--c-text-3)", fontFamily:"monospace" }}>{m.username}</td>
                        <td><span className={`gc-badge ${ROLE_COLORS[m.role]}`} style={{ display:"inline-flex" }}>{m.role}</span></td>
                        <td style={{ fontSize:12, color:"var(--c-text-3)" }}>{m.lastLogin}</td>
                        <td><span className={`gc-badge ${m.status==="active" ? "gc-badge-public" : "gc-badge-private"}`} style={{ display:"inline-flex" }}>{m.status}</span></td>
                        <td><button className="gc-btn gc-btn-ghost gc-btn-icon"><MoreHorizontal size={14}/></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* LICENSES */}
          {tab === "licenses" && (
            <div>
              <h2 style={{ fontSize:16, fontWeight:600, marginBottom:16 }}>Licenses</h2>
              <div className="gc-card" style={{ padding:18 }}>
                <div style={{ fontWeight:600, fontSize:13, marginBottom:14 }}>License Allocation</div>
                {[
                  ["GeoCollect Studio","4 / 10 used","40%","#0079c1"],
                  ["Field Collector App","2 / 20 used","10%","#2e7d32"],
                  ["Map Viewer","4 / 10 used","40%","#e65100"],
                ].map(([name,usage,pct,color]) => (
                  <div key={name} style={{ marginBottom:16 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginBottom:5 }}>
                      <span style={{ fontWeight:500 }}>{name}</span>
                      <span style={{ color:"var(--c-text-3)" }}>{usage}</span>
                    </div>
                    <div className="gc-progress-bar"><div className="gc-progress-fill" style={{ width:pct, background:color }}/></div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STATUS */}
          {tab === "status" && (
            <div>
              <h2 style={{ fontSize:16, fontWeight:600, marginBottom:16 }}>Service Status</h2>
              <div style={{ background:"#e8f5e9", border:"1px solid #a5d6a7", borderRadius:6, padding:"10px 14px", marginBottom:16, fontSize:12, color:"#2e7d32", display:"flex", alignItems:"center", gap:8 }}>
                <CheckCircle2 size={14}/> All systems operational
              </div>
              <div className="gc-card" style={{ overflow:"hidden" }}>
                {SERVICES.map(([svc,status]) => (
                  <div key={svc} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 16px", borderBottom:"1px solid var(--c-border-light)" }}>
                    <span style={{ fontSize:13 }}>{svc}</span>
                    <span className="gc-badge gc-badge-public" style={{ display:"inline-flex", alignItems:"center", gap:4 }}>
                      <span style={{ width:6, height:6, borderRadius:"50%", background:"var(--c-success)", display:"inline-block" }}/>
                      {status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SETTINGS */}
          {tab === "settings" && (
            <div style={{ display:"flex", flexDirection:"column", gap:16, maxWidth:620 }}>
              <h2 style={{ fontSize:16, fontWeight:600 }}>Organization Settings</h2>

              <div className="gc-card" style={{ padding:18 }}>
                <div style={{ fontWeight:600, fontSize:13, marginBottom:14 }}>General</div>
                {[["Organization Name","Popson Geospatial Service"],["Short Name","popson"],["Description","Open-architecture geospatial data collection platform."]].map(([lbl,val]) => (
                  <div key={lbl} className="gc-prop-row">
                    <label style={{ fontSize:12, color:"var(--c-text-2)", display:"block", marginBottom:3 }}>{lbl}</label>
                    <input className="gc-prop-input" defaultValue={val}/>
                  </div>
                ))}
                <button onClick={save} className={`gc-btn gc-btn-sm ${saved ? "gc-btn-default" : "gc-btn-primary"}`} style={{ marginTop:8, gap:5 }}>
                  {saved ? <><CheckCircle2 size={12} color="var(--c-success)"/> Saved!</> : "Save Changes"}
                </button>
              </div>

              <div className="gc-card" style={{ padding:18 }}>
                <div style={{ fontWeight:600, fontSize:13, marginBottom:14 }}>Security</div>
                {[["Require multi-factor authentication","MFA"],["Allow access via trusted domains only","Trusted"],["Enable HTTPS only","HTTPS"]].map(([lbl,key]) => (
                  <label key={key} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 0", borderBottom:"1px solid var(--c-border-light)", cursor:"pointer", fontSize:13 }}>
                    <input type="checkbox" defaultChecked={key==="HTTPS"} style={{ accentColor:"var(--c-blue)" }}/>{lbl}
                  </label>
                ))}
              </div>

              <div className="gc-card" style={{ padding:18 }}>
                <div style={{ fontWeight:600, fontSize:13, marginBottom:14 }}>Map Settings</div>
                <div className="gc-prop-row">
                  <label style={{ fontSize:12, color:"var(--c-text-2)", display:"block", marginBottom:3 }}>Default Basemap</label>
                  <select className="gc-prop-input"><option>Streets</option><option>Imagery</option><option>Topo</option><option>Dark Gray</option></select>
                </div>
                <div className="gc-prop-row">
                  <label style={{ fontSize:12, color:"var(--c-text-2)", display:"block", marginBottom:3 }}>Default Extent</label>
                  <select className="gc-prop-input"><option>Nigeria</option><option>Niger Delta</option><option>World</option></select>
                </div>
              </div>

              {/* DANGER ZONE */}
              <div className="gc-card" style={{ padding:18, border:"1px solid #fca5a5" }}>
                <div style={{ fontWeight:600, fontSize:13, marginBottom:6, color:"#dc2626" }}>⚠️ Danger Zone</div>
                <p style={{ fontSize:12, color:"var(--c-text-3)", marginBottom:14, lineHeight:1.5 }}>
                  Permanently delete all submitted feature data, attachments, and audit records.
                  This action cannot be undone. Only platform administrators can perform this action.
                </p>
                {resetStatus === "done" && (
                  <div style={{ background:"#f0fdf4", border:"1px solid #86efac", borderRadius:6, padding:"8px 12px", fontSize:12, color:"#166534", marginBottom:12 }}>
                    ✅ {resetMsg}
                  </div>
                )}
                {resetStatus === "error" && (
                  <div style={{ background:"#fef2f2", border:"1px solid #fca5a5", borderRadius:6, padding:"8px 12px", fontSize:12, color:"#dc2626", marginBottom:12 }}>
                    ❌ {resetMsg}
                  </div>
                )}
                {!resetConfirm ? (
                  <button
                    onClick={() => setResetConfirm(true)}
                    className="gc-btn gc-btn-danger gc-btn-sm"
                    style={{ gap:5 }}
                  >
                    🗑️ Wipe All Data
                  </button>
                ) : (
                  <div style={{ background:"#fff7ed", border:"1px solid #fed7aa", borderRadius:8, padding:14 }}>
                    <div style={{ fontSize:13, fontWeight:600, color:"#9a3412", marginBottom:8 }}>
                      Are you absolutely sure?
                    </div>
                    <p style={{ fontSize:12, color:"#7c2d12", marginBottom:12, lineHeight:1.5 }}>
                      This will permanently delete ALL features, attachments, and audit records from the database.
                    </p>
                    <div style={{ display:"flex", gap:8 }}>
                      <button
                        onClick={handleReset}
                        disabled={resetStatus === "loading"}
                        className="gc-btn gc-btn-danger gc-btn-sm"
                        style={{ gap:5 }}
                      >
                        {resetStatus === "loading" ? "Wiping…" : "Yes, wipe everything"}
                      </button>
                      <button onClick={() => setResetConfirm(false)} className="gc-btn gc-btn-default gc-btn-sm">
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}
