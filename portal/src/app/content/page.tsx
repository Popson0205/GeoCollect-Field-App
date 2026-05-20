"use client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import TopNav from "@/components/TopNav";
import {
  Search, Plus, LayoutList, LayoutGrid,
  Globe, Lock, Users, Share2, MoreHorizontal,
  Trash2, FolderOpen, Map, Edit, ArrowUpDown, CheckSquare, Square,
} from "lucide-react";

type FilterTab = "My Content" | "My Favorites" | "My Groups" | "My Organization" | "Living Atlas";
type ViewMode  = "table" | "grid";
type SortField = "modified" | "title" | "type" | "owner";

interface Item {
  id: string; name: string; type: string; subtype: string;
  owner: string; modified: string; sharing: "private" | "organization" | "public";
  size?: string; tags?: string[];
}

const ITEMS: Item[] = [
  { id:"fl1", name:"Niger Delta Asset Survey",                          type:"layer", subtype:"Feature layer (hosted)",        owner:"Faridat A", modified:"Apr 16, 2026", sharing:"organization", size:"1.2 MB" },
  { id:"fl2", name:"Niger Delta Asset Survey_view",                     type:"view",  subtype:"Feature layer (hosted, view)",   owner:"Faridat A", modified:"Apr 16, 2026", sharing:"organization", size:"—" },
  { id:"f1",  name:"Niger Delta Asset Survey",                          type:"form",  subtype:"Survey form",                    owner:"Faridat A", modified:"Apr 15, 2026", sharing:"organization", size:"48 KB" },
  { id:"m1",  name:"Niger Delta Power Holding Asset Map",               type:"map",   subtype:"Web map",                        owner:"Faridat A", modified:"Apr 14, 2026", sharing:"organization", size:"—" },
  { id:"d1",  name:"Niger Delta Power Holding Company Asset Dashboard", type:"dash",  subtype:"Dashboard",                      owner:"Faridat A", modified:"Apr 13, 2026", sharing:"private",      size:"—" },
  { id:"fl3", name:"NCFRMI Field Survey Layer",                         type:"layer", subtype:"Feature layer (hosted)",          owner:"Faridat A", modified:"Apr 12, 2026", sharing:"public",       size:"3.4 MB" },
  { id:"m2",  name:"GIS Day 2025 Demo Map",                             type:"map",   subtype:"Web map",                        owner:"Faridat A", modified:"Apr 10, 2026", sharing:"public",       size:"—" },
  { id:"f2",  name:"NCFRMI Field Survey Form",                          type:"form",  subtype:"Survey form",                    owner:"Faridat A", modified:"Apr 8, 2026",  sharing:"organization", size:"22 KB" },
];

const ICON_BG: Record<string,string>    = { layer:"#fff3e0", view:"#fce4ec", form:"#e8f5e9", map:"#e3f2fd", dash:"#f3e5f5" };
const ICON_EMOJI: Record<string,string> = { layer:"🗂️", view:"🗂️", form:"📋", map:"🗺️", dash:"📊" };
const TYPE_LABEL: Record<string,string> = { layer:"Feature Layer", view:"Feature Layer", form:"Form", map:"Map", dash:"Dashboard" };

const SHARING = {
  private:      { icon:<Lock size={11}/>,  label:"Private",      cls:"gc-badge-private" },
  organization: { icon:<Users size={11}/>, label:"Organization", cls:"gc-badge-org" },
  public:       { icon:<Globe size={11}/>, label:"Public",       cls:"gc-badge-public" },
};
const FILTER_TABS: FilterTab[] = ["My Content","My Favorites","My Groups","My Organization","Living Atlas"];
const SORT_OPTIONS: { value: SortField; label: string }[] = [
  { value:"modified", label:"Date Modified" },
  { value:"title",    label:"Title" },
  { value:"type",     label:"Item Type" },
  { value:"owner",    label:"Owner" },
];

export default function ContentPage() {
  const [tab, setTab]           = useState<FilterTab>("My Content");
  const [view, setView]         = useState<ViewMode>("table");
  const [query, setQuery]       = useState("");
  const [sort, setSort]         = useState<SortField>("modified");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [ctx, setCtx]           = useState<{ id: string; x: number; y: number } | null>(null);
  const [flyout, setFlyout]     = useState<Item | null>(null);
  const ctxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = () => setCtx(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, []);

  const filtered = ITEMS
    .filter(i => i.name.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => {
      if (sort === "title") return a.name.localeCompare(b.name);
      if (sort === "type")  return a.type.localeCompare(b.type);
      if (sort === "owner") return a.owner.localeCompare(b.owner);
      return b.modified.localeCompare(a.modified);
    });

  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map(i => i.id)));
  };
  const toggleOne = (id: string) => {
    const s = new Set(selected); s.has(id) ? s.delete(id) : s.add(id); setSelected(s);
  };
  const openCtx = (e: React.MouseEvent, id: string) => {
    e.preventDefault(); e.stopPropagation();
    setCtx({ id, x: e.clientX, y: e.clientY });
  };

  return (
    <div className="gc-page" style={{ height:"100vh", overflow:"hidden", display:"flex", flexDirection:"column" }}>
      <TopNav />

      {/* Filter tabs */}
      <div className="gc-filter-strip">
        {FILTER_TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} className={`gc-filter-tab ${tab === t ? "active" : ""}`}>{t}</button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="gc-toolbar">
        <Link href="/forms/new" className="gc-btn gc-btn-primary gc-btn-sm" style={{ gap:5 }}>
          <Plus size={13}/> New Item
        </Link>
        <div className="gc-search">
          <Search size={13}/>
          <input className="gc-input" placeholder="Search content…" value={query} onChange={e => setQuery(e.target.value)}/>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:6, marginLeft:"auto" }}>
          <span style={{ fontSize:12, color:"var(--c-text-3)" }}>Sort by</span>
          <select className="gc-select" value={sort} onChange={e => setSort(e.target.value as SortField)}>
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <div className="gc-view-toggle">
            <button className={`gc-view-btn ${view === "table" ? "active" : ""}`} onClick={() => setView("table")} title="Table view"><LayoutList size={14}/></button>
            <button className={`gc-view-btn ${view === "grid"  ? "active" : ""}`} onClick={() => setView("grid")}  title="Grid view"><LayoutGrid size={14}/></button>
          </div>
        </div>
      </div>

      {/* Bulk bar */}
      {selected.size > 0 && (
        <div className="gc-bulk-bar">
          <span>{selected.size} item{selected.size > 1 ? "s" : ""} selected</span>
          <button className="gc-btn gc-btn-default gc-btn-sm" style={{ gap:5 }}><Share2 size={12}/> Share</button>
          <button className="gc-btn gc-btn-default gc-btn-sm" style={{ gap:5 }}><FolderOpen size={12}/> Move</button>
          <button className="gc-btn gc-btn-danger gc-btn-sm" style={{ gap:5 }}><Trash2 size={12}/> Delete</button>
          <button className="gc-btn gc-btn-ghost gc-btn-sm" onClick={() => setSelected(new Set())}>Clear</button>
        </div>
      )}

      {/* Table / Grid */}
      <div className="gc-table-wrap" style={{ flex:1, overflowY:"auto", paddingTop:12 }}>
        {view === "table" ? (
          <table className="gc-table">
            <thead>
              <tr>
                <th style={{ width:36 }}>
                  <button onClick={toggleAll} style={{ background:"none", border:"none", cursor:"pointer", color:"var(--c-text-3)", display:"flex" }}>
                    {selected.size === filtered.length && filtered.length > 0 ? <CheckSquare size={14}/> : <Square size={14}/>}
                  </button>
                </th>
                <th>Title <ArrowUpDown size={10} style={{ marginLeft:3, opacity:0.5 }}/></th>
                <th>Type</th><th>Owner</th><th>Modified</th><th>Sharing</th><th>Size</th><th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(item => {
                const sm = SHARING[item.sharing]; const isSel = selected.has(item.id);
                return (
                  <tr key={item.id} className={isSel ? "selected" : ""} onClick={() => setFlyout(item)}>
                    <td onClick={e => { e.stopPropagation(); toggleOne(item.id); }}>
                      <button style={{ background:"none", border:"none", cursor:"pointer", color:"var(--c-text-3)", display:"flex" }}>
                        {isSel ? <CheckSquare size={14} color="var(--c-blue)"/> : <Square size={14}/>}
                      </button>
                    </td>
                    <td>
                      <div style={{ display:"flex", alignItems:"center", gap:9 }}>
                        <div className="gc-item-icon" style={{ background: ICON_BG[item.type], width:28, height:28, borderRadius:3, display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, flexShrink:0 }}>
                          {ICON_EMOJI[item.type]}
                        </div>
                        <div>
                          <div className="gc-item-name gc-truncate" style={{ maxWidth:260 }}>{item.name}</div>
                          <div className="gc-item-sub">{item.subtype}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontSize:12, color:"var(--c-text-3)" }}>{TYPE_LABEL[item.type]}</td>
                    <td style={{ fontSize:12, color:"var(--c-text-3)" }}>{item.owner}</td>
                    <td style={{ fontSize:12, color:"var(--c-text-3)", whiteSpace:"nowrap" }}>{item.modified}</td>
                    <td><span className={`gc-badge ${sm.cls}`} style={{ display:"inline-flex", alignItems:"center", gap:4 }}>{sm.icon} {sm.label}</span></td>
                    <td style={{ fontSize:12, color:"var(--c-text-4)" }}>{item.size ?? "—"}</td>
                    <td onClick={e => e.stopPropagation()}>
                      <button className="gc-btn gc-btn-ghost gc-btn-icon" onClick={e => openCtx(e, item.id)}><MoreHorizontal size={15}/></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="gc-grid" style={{ padding:"0 0 24px" }}>
            {filtered.map(item => (
              <div key={item.id} className="gc-grid-card" onClick={() => setFlyout(item)}>
                <div className="gc-grid-thumb" style={{ background: ICON_BG[item.type] }}>{ICON_EMOJI[item.type]}</div>
                <div className="gc-grid-body">
                  <div className="gc-grid-title gc-truncate">{item.name}</div>
                  <div className="gc-grid-meta">{TYPE_LABEL[item.type]} · {item.owner}</div>
                  <div className="gc-grid-meta" style={{ marginTop:4 }}>
                    <span className={`gc-badge ${SHARING[item.sharing].cls}`} style={{ display:"inline-flex", alignItems:"center", gap:3 }}>
                      {SHARING[item.sharing].icon} {SHARING[item.sharing].label}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="gc-pagination">
          {[1,2,3,"…",8].map((p, i) => (
            <button key={i} className={`gc-page-btn ${p === 1 ? "active" : ""}`}>{p}</button>
          ))}
        </div>
      </div>

      {/* Item flyout */}
      <div className={`gc-flyout ${flyout ? "open" : ""}`}>
        {flyout && (
          <>
            <div style={{ padding:"14px 16px", borderBottom:"1px solid var(--c-border-light)", display:"flex", alignItems:"flex-start", gap:10 }}>
              <div className="gc-item-icon" style={{ background: ICON_BG[flyout.type], width:36, height:36, borderRadius:4, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>
                {ICON_EMOJI[flyout.type]}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:14, fontWeight:600, color:"var(--c-text)", lineHeight:1.3 }}>{flyout.name}</div>
                <div style={{ fontSize:11, color:"var(--c-text-4)", marginTop:2 }}>{flyout.subtype}</div>
              </div>
              <button className="gc-btn gc-btn-ghost gc-btn-icon" onClick={() => setFlyout(null)}>✕</button>
            </div>
            <div style={{ padding:"14px 16px", flex:1, overflowY:"auto" }}>
              <div style={{ display:"flex", gap:7, marginBottom:14, flexWrap:"wrap" }}>
                <Link href={`/content/${flyout.id}`} className="gc-btn gc-btn-primary gc-btn-sm" style={{ gap:5 }}><Edit size={12}/> Open</Link>
                {flyout.type === "layer" && <Link href={`/map?layer=${flyout.id}`} className="gc-btn gc-btn-default gc-btn-sm" style={{ gap:5 }}><Map size={12}/> Open in Map</Link>}
                <button className="gc-btn gc-btn-default gc-btn-sm" style={{ gap:5 }}><Share2 size={12}/> Share</button>
              </div>
              <dl style={{ display:"grid", gridTemplateColumns:"auto 1fr", gap:"8px 16px", fontSize:12 }}>
                {[["Owner",flyout.owner],["Modified",flyout.modified],["Type",TYPE_LABEL[flyout.type]],["Sharing",flyout.sharing],["Size",flyout.size ?? "—"]].map(([k,v]) => (
                  <>
                    <dt key={`k-${k}`} style={{ color:"var(--c-text-4)", fontWeight:500 }}>{k}</dt>
                    <dd key={`v-${k}`} style={{ color:"var(--c-text-2)", textTransform:"capitalize" }}>{v}</dd>
                  </>
                ))}
              </dl>
            </div>
          </>
        )}
      </div>

      {/* Context menu */}
      {ctx && (
        <div ref={ctxRef} className="gc-ctx-menu" style={{ top: ctx.y, left: ctx.x }} onClick={e => e.stopPropagation()}>
          <div className="gc-ctx-item"><Edit size={13}/> Open Item Details</div>
          <div className="gc-ctx-item"><Map size={13}/> Open in Map Viewer</div>
          <div className="gc-ctx-item"><Share2 size={13}/> Share</div>
          <div className="gc-ctx-item"><FolderOpen size={13}/> Move</div>
          <div className="gc-ctx-divider"/>
          <div className="gc-ctx-item danger"><Trash2 size={13}/> Delete</div>
        </div>
      )}
    </div>
  );
}
