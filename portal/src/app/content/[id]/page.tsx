"use client";
import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import TopNav from "@/components/TopNav";
import { Edit, Share2, Map, Download, Trash2, Globe, Lock, Users, BarChart2, Table2, ChevronRight } from "lucide-react";

type DetailTab = "Overview" | "Data" | "Visualization" | "Settings" | "Share" | "Usage";

const ITEMS: Record<string, {
  name: string; type: string; subtype: string; sharing: "private"|"organization"|"public";
  owner: string; modified: string; created: string; size: string; tags: string[];
  description: string; fields?: { name: string; type: string; nullable: boolean }[];
}> = {
  fl1: {
    name: "Niger Delta Asset Survey", type: "layer", subtype: "Feature layer (hosted)",
    sharing: "organization", owner: "Faridat A", modified: "Apr 16, 2026", created: "Apr 10, 2026",
    size: "1.2 MB", tags: ["niger delta","assets","survey","2026"],
    description: "Hosted feature layer containing asset survey data collected from the Niger Delta region by Popson Geospatial field teams.",
    fields: [
      { name:"OBJECTID",    type:"esriFieldTypeOID",     nullable:false },
      { name:"name",        type:"esriFieldTypeString",  nullable:true },
      { name:"status",      type:"esriFieldTypeString",  nullable:true },
      { name:"area_m2",     type:"esriFieldTypeDouble",  nullable:true },
      { name:"created_date",type:"esriFieldTypeDate",    nullable:true },
      { name:"collector",   type:"esriFieldTypeString",  nullable:true },
      { name:"geometry",    type:"esriFieldTypeGeometry",nullable:false },
    ],
  },
  fl2: {
    name: "Niger Delta Asset Survey_view", type: "view", subtype: "Feature layer (hosted, view)",
    sharing: "organization", owner: "Faridat A", modified: "Apr 16, 2026", created: "Apr 10, 2026",
    size: "—", tags: ["niger delta","assets","view","2026"],
    description: "Read-only view of the Niger Delta Asset Survey feature layer. Used for sharing data with stakeholders who need view-only access.",
    fields: [
      { name:"OBJECTID",    type:"esriFieldTypeOID",     nullable:false },
      { name:"name",        type:"esriFieldTypeString",  nullable:true },
      { name:"status",      type:"esriFieldTypeString",  nullable:true },
      { name:"area_m2",     type:"esriFieldTypeDouble",  nullable:true },
      { name:"collector",   type:"esriFieldTypeString",  nullable:true },
      { name:"geometry",    type:"esriFieldTypeGeometry",nullable:false },
    ],
  },
  fl3: {
    name: "NCFRMI Field Survey Layer", type: "layer", subtype: "Feature layer (hosted)",
    sharing: "public", owner: "Faridat A", modified: "Apr 12, 2026", created: "Apr 5, 2026",
    size: "3.4 MB", tags: ["ncfrmi","field survey","land","2026"],
    description: "Hosted feature layer for the NCFRMI (National Centre for Remote Sensing, Jos) field survey. Contains land-use and boundary data collected by field teams across multiple states.",
    fields: [
      { name:"OBJECTID",    type:"esriFieldTypeOID",     nullable:false },
      { name:"parcel_id",   type:"esriFieldTypeString",  nullable:true },
      { name:"land_use",    type:"esriFieldTypeString",  nullable:true },
      { name:"area_ha",     type:"esriFieldTypeDouble",  nullable:true },
      { name:"state",       type:"esriFieldTypeString",  nullable:true },
      { name:"lga",         type:"esriFieldTypeString",  nullable:true },
      { name:"surveyed_by", type:"esriFieldTypeString",  nullable:true },
      { name:"survey_date", type:"esriFieldTypeDate",    nullable:true },
      { name:"geometry",    type:"esriFieldTypeGeometry",nullable:false },
    ],
  },
  f1: {
    name: "Niger Delta Asset Survey Form", type: "form", subtype: "Survey form",
    sharing: "organization", owner: "Faridat A", modified: "Apr 15, 2026", created: "Apr 9, 2026",
    size: "48 KB", tags: ["form","survey","field"],
    description: "Survey form used by field collectors to capture asset data in the Niger Delta region.",
  },
  f2: {
    name: "NCFRMI Field Survey Form", type: "form", subtype: "Survey form",
    sharing: "organization", owner: "Faridat A", modified: "Apr 8, 2026", created: "Apr 2, 2026",
    size: "22 KB", tags: ["ncfrmi","form","land survey"],
    description: "Data collection form for the NCFRMI field survey campaign. Captures parcel boundaries, land-use classification, and socio-economic attributes.",
  },
  m1: {
    name: "Niger Delta Power Holding Asset Map", type: "map", subtype: "Web map",
    sharing: "organization", owner: "Faridat A", modified: "Apr 14, 2026", created: "Apr 8, 2026",
    size: "—", tags: ["map","power","assets"],
    description: "Web map showing all power holding company assets in the Niger Delta region.",
  },
  m2: {
    name: "GIS Day 2025 Demo Map", type: "map", subtype: "Web map",
    sharing: "public", owner: "Faridat A", modified: "Apr 10, 2026", created: "Nov 15, 2025",
    size: "—", tags: ["gis day","demo","2025","public"],
    description: "Demonstration web map created for GIS Day 2025. Showcases GeoCollect's data collection and visualization capabilities using sample datasets from across Nigeria.",
  },
  d1: {
    name: "Niger Delta Power Holding Company Asset Dashboard", type: "dash", subtype: "Dashboard",
    sharing: "private", owner: "Faridat A", modified: "Apr 13, 2026", created: "Apr 7, 2026",
    size: "—", tags: ["dashboard","power holding","niger delta","assets"],
    description: "Interactive dashboard summarising asset survey results for the Niger Delta Power Holding Company (NDPHC). Displays feature counts, status breakdowns, and a live map panel backed by the Niger Delta Asset Survey feature layer.",
  },
};

const ICON_BG: Record<string,string>    = { layer:"#fff3e0", view:"#fce4ec", form:"#e8f5e9", map:"#e3f2fd", dash:"#f3e5f5" };
const ICON_EMOJI: Record<string,string> = { layer:"🗂️", view:"🗂️", form:"📋", map:"🗺️", dash:"📊" };
const SHARING_META = {
  private:      { icon:<Lock size={12}/>,  label:"Private",      cls:"gc-badge-private" },
  organization: { icon:<Users size={12}/>, label:"Organization", cls:"gc-badge-org" },
  public:       { icon:<Globe size={12}/>, label:"Public",       cls:"gc-badge-public" },
};
const TABS: DetailTab[] = ["Overview","Data","Visualization","Settings","Share","Usage"];

export default function ContentDetailPage() {
  const params = useParams();
  const id = String(params.id);
  const item = ITEMS[id] ?? {
    name: `Item ${id}`, type: "layer", subtype: "Feature layer", sharing: "private" as const,
    owner: "Faridat A", modified: "Apr 2026", created: "Apr 2026",
    size: "—", tags: [], description: "No description available.",
  };

  const [tab, setTab] = useState<DetailTab>("Overview");
  const sm = SHARING_META[item.sharing];

  return (
    <div className="gc-page" style={{ height:"100vh", overflow:"hidden", display:"flex", flexDirection:"column" }}>
      <TopNav />

      {/* Detail header */}
      <div className="gc-detail-hdr">
        <div className="gc-breadcrumb">
          <Link href="/content" style={{ color:"var(--c-link)" }}>Content</Link>
          <ChevronRight size={12}/>
          <span>{item.name}</span>
        </div>
        <div className="gc-detail-title-row">
          <div className="gc-detail-icon" style={{ background: ICON_BG[item.type] }}>
            {ICON_EMOJI[item.type]}
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div className="gc-detail-name">{item.name}</div>
            <div className="gc-detail-sub">{item.subtype} · {item.owner} · Modified {item.modified}</div>
          </div>
          <div className="gc-detail-actions">
            <span className={`gc-badge ${sm.cls}`} style={{ display:"inline-flex", alignItems:"center", gap:4 }}>{sm.icon} {sm.label}</span>
            {item.type === "layer" && <Link href={`/map?layer=${id}`} className="gc-btn gc-btn-default gc-btn-sm" style={{ gap:5 }}><Map size={12}/> Open in Map</Link>}
            <button className="gc-btn gc-btn-default gc-btn-sm" style={{ gap:5 }}><Share2 size={12}/> Share</button>
            <button className="gc-btn gc-btn-default gc-btn-sm" style={{ gap:5 }}><Download size={12}/> Export</button>
            <button className="gc-btn gc-btn-primary gc-btn-sm" style={{ gap:5 }}><Edit size={12}/> Edit</button>
          </div>
        </div>
        <div className="gc-tabs">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)} className={`gc-tab ${tab === t ? "active" : ""}`}>{t}</button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div style={{ flex:1, overflowY:"auto", padding:"20px 24px" }}>
        {tab === "Overview" && (
          <div style={{ display:"grid", gridTemplateColumns:"1fr 280px", gap:20, maxWidth:1100 }}>
            <div>
              <div className="gc-card" style={{ padding:18, marginBottom:16 }}>
                <div style={{ fontWeight:600, fontSize:13, marginBottom:10 }}>Description</div>
                <p style={{ fontSize:13, color:"var(--c-text-2)", lineHeight:1.6 }}>{item.description}</p>
              </div>
              {item.fields && (
                <div className="gc-card" style={{ overflow:"hidden" }}>
                  <div style={{ padding:"12px 16px", fontWeight:600, fontSize:13, borderBottom:"1px solid var(--c-border-light)" }}>Fields ({item.fields.length})</div>
                  <table className="gc-table" style={{ borderRadius:0, border:"none", boxShadow:"none" }}>
                    <thead><tr><th>Field Name</th><th>Type</th><th>Nullable</th></tr></thead>
                    <tbody>
                      {item.fields.map(f => (
                        <tr key={f.name}>
                          <td style={{ fontFamily:"monospace", fontSize:12 }}>{f.name}</td>
                          <td style={{ fontSize:12, color:"var(--c-text-3)" }}>{f.type.replace("esriFieldType","")}</td>
                          <td><span className={`gc-badge ${f.nullable ? "gc-badge-public" : "gc-badge-private"}`}>{f.nullable ? "Yes" : "No"}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div>
              <div className="gc-card" style={{ padding:16 }}>
                <div style={{ fontWeight:600, fontSize:13, marginBottom:12 }}>Item Details</div>
                {[
                  ["Owner", item.owner],["Modified", item.modified],["Created", item.created],
                  ["Size", item.size],["Type", item.subtype],
                ].map(([k,v]) => (
                  <div key={k} style={{ display:"flex", justifyContent:"space-between", padding:"6px 0", borderBottom:"1px solid var(--c-border-light)", fontSize:12 }}>
                    <span style={{ color:"var(--c-text-4)", fontWeight:500 }}>{k}</span>
                    <span style={{ color:"var(--c-text-2)" }}>{v}</span>
                  </div>
                ))}
                <div style={{ marginTop:12 }}>
                  <div style={{ fontSize:11, color:"var(--c-text-4)", fontWeight:600, marginBottom:6 }}>Tags</div>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:4 }}>
                    {item.tags.map(tag => (
                      <span key={tag} style={{ background:"var(--c-blue-light)", color:"var(--c-blue)", padding:"2px 8px", borderRadius:20, fontSize:11 }}>{tag}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === "Data" && (
          <div className="gc-card" style={{ overflow:"hidden" }}>
            <div style={{ padding:"12px 16px", borderBottom:"1px solid var(--c-border-light)", display:"flex", alignItems:"center", gap:10 }}>
              <Table2 size={14} style={{ color:"var(--c-text-4)" }}/>
              <span style={{ fontWeight:600, fontSize:13 }}>Attribute Table</span>
              <span style={{ fontSize:11, color:"var(--c-text-4)", marginLeft:4 }}>48 records</span>
            </div>
            <table className="gc-table" style={{ borderRadius:0, border:"none", boxShadow:"none" }}>
              <thead><tr><th>OBJECTID</th><th>name</th><th>status</th><th>area_m2</th><th>collector</th><th>created_date</th></tr></thead>
              <tbody>
                {Array.from({ length: 10 }, (_, i) => (
                  <tr key={i}>
                    <td style={{ fontSize:12 }}>{i + 1}</td>
                    <td style={{ fontSize:12 }}>Asset {String(i + 1).padStart(3, "0")}</td>
                    <td><span className="gc-badge gc-badge-public">active</span></td>
                    <td style={{ fontSize:12 }}>{(Math.random() * 5000 + 500).toFixed(1)}</td>
                    <td style={{ fontSize:12 }}>Faridat A</td>
                    <td style={{ fontSize:12, color:"var(--c-text-3)" }}>Apr {10 + i}, 2026</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === "Visualization" && (
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:320, color:"var(--c-text-4)", gap:10 }}>
            <BarChart2 size={40} style={{ opacity:0.3 }}/>
            <div style={{ fontSize:13 }}>Open in Map Viewer to visualize this layer</div>
            <Link href={`/map?layer=${id}`} className="gc-btn gc-btn-primary gc-btn-sm" style={{ gap:5 }}><Map size={12}/> Open in Map Viewer</Link>
          </div>
        )}

        {tab === "Settings" && (
          <div style={{ maxWidth:560 }}>
            <div className="gc-card" style={{ padding:18 }}>
              <div style={{ fontWeight:600, fontSize:13, marginBottom:14 }}>Item Settings</div>
              {[["Title", item.name],["Summary", item.description.slice(0,80)]].map(([lbl,val]) => (
                <div key={lbl} className="gc-prop-row">
                  <label style={{ fontSize:12, color:"var(--c-text-2)", display:"block", marginBottom:3 }}>{lbl}</label>
                  <input className="gc-prop-input" defaultValue={val}/>
                </div>
              ))}
              <button className="gc-btn gc-btn-primary gc-btn-sm" style={{ marginTop:8 }}>Save Changes</button>
            </div>
            <div className="gc-card" style={{ padding:18, marginTop:16 }}>
              <div style={{ fontWeight:600, fontSize:13, marginBottom:14, color:"var(--c-danger)" }}>Danger Zone</div>
              <button className="gc-btn gc-btn-danger gc-btn-sm" style={{ gap:5 }}><Trash2 size={12}/> Delete Item</button>
            </div>
          </div>
        )}

        {tab === "Share" && (
          <div style={{ maxWidth:560 }}>
            <div className="gc-card" style={{ padding:18 }}>
              <div style={{ fontWeight:600, fontSize:13, marginBottom:14 }}>Sharing Settings</div>
              {[
                { label:"Private", desc:"Only you can access this item", value:"private", icon:<Lock size={16}/> },
                { label:"Organization", desc:"All members of Popson Geospatial can access", value:"organization", icon:<Users size={16}/> },
                { label:"Public", desc:"Anyone on the internet can access", value:"public", icon:<Globe size={16}/> },
              ].map(opt => (
                <label key={opt.value} style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 0", borderBottom:"1px solid var(--c-border-light)", cursor:"pointer" }}>
                  <input type="radio" name="sharing" defaultChecked={item.sharing === opt.value} style={{ accentColor:"var(--c-blue)" }}/>
                  <div style={{ color:"var(--c-text-3)" }}>{opt.icon}</div>
                  <div>
                    <div style={{ fontSize:13, fontWeight:500 }}>{opt.label}</div>
                    <div style={{ fontSize:11, color:"var(--c-text-4)" }}>{opt.desc}</div>
                  </div>
                </label>
              ))}
              <button className="gc-btn gc-btn-primary gc-btn-sm" style={{ marginTop:12 }}>Update Sharing</button>
            </div>
          </div>
        )}

        {tab === "Usage" && (
          <div className="gc-card" style={{ padding:18, maxWidth:560 }}>
            <div style={{ fontWeight:600, fontSize:13, marginBottom:14 }}>Usage Statistics</div>
            {[["Total Requests","1,248"],["Unique Users","12"],["Last Accessed","Apr 17, 2026"],["Created",item.created]].map(([k,v]) => (
              <div key={k} style={{ display:"flex", justifyContent:"space-between", padding:"8px 0", borderBottom:"1px solid var(--c-border-light)", fontSize:13 }}>
                <span style={{ color:"var(--c-text-3)" }}>{k}</span>
                <span style={{ fontWeight:500 }}>{v}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
