"use client";
import { useState } from "react";
import TopNav from "@/components/TopNav";
import { Plus, Trash2, Settings, Save, CheckCircle2, BarChart2, LineChart, PieChart, Map, Table2, Hash, Type } from "lucide-react";

type WType = "bar"|"line"|"pie"|"map"|"table"|"stat"|"text";
interface Widget { id:string; type:WType; title:string; source?:string; w:number; h:number; }

const PALETTE: { type:WType; label:string; icon:React.ReactNode }[] = [
  { type:"stat",  label:"Stat Card",  icon:<Hash size={14}/> },
  { type:"bar",   label:"Bar Chart",  icon:<BarChart2 size={14}/> },
  { type:"line",  label:"Line Chart", icon:<LineChart size={14}/> },
  { type:"pie",   label:"Pie Chart",  icon:<PieChart size={14}/> },
  { type:"map",   label:"Map",        icon:<Map size={14}/> },
  { type:"table", label:"Table",      icon:<Table2 size={14}/> },
  { type:"text",  label:"Text",       icon:<Type size={14}/> },
];
const SOURCES = ["Niger Delta Asset Survey","Road Network","NCFRMI Field Survey","GIS Day 2025"];
const ICONS: Record<WType,React.ReactNode> = {
  bar:<BarChart2 size={28}/>, line:<LineChart size={28}/>, pie:<PieChart size={28}/>,
  map:<Map size={28}/>, table:<Table2 size={28}/>, stat:<Hash size={28}/>, text:<Type size={28}/>,
};
const STAT_VALS: Record<string,number> = { "Total Features":48, "Forms Submitted":72, "Active Users":4, "Maps Created":2 };

const INIT: Widget[] = [
  { id:"w1", type:"stat",  title:"Total Features",   source:"Niger Delta Asset Survey", w:1, h:1 },
  { id:"w2", type:"stat",  title:"Forms Submitted",  source:"NCFRMI Field Survey",      w:1, h:1 },
  { id:"w3", type:"stat",  title:"Active Users",     source:"",                         w:1, h:1 },
  { id:"w4", type:"stat",  title:"Maps Created",     source:"",                         w:1, h:1 },
  { id:"w5", type:"bar",   title:"Submissions by Day",source:"Niger Delta Asset Survey",w:2, h:2 },
  { id:"w6", type:"map",   title:"Feature Map",      source:"Niger Delta Asset Survey", w:2, h:3 },
];

export default function DashboardBuilderPage() {
  const [name,    setName]    = useState("Niger Delta Power Holding Company Asset Dashboard");
  const [widgets, setWidgets] = useState<Widget[]>(INIT);
  const [sel,     setSel]     = useState<string|null>(null);
  const [saved,   setSaved]   = useState(false);

  const add = (type:WType) => {
    const w:Widget = { id:crypto.randomUUID(), type, title:PALETTE.find(p=>p.type===type)?.label??"Widget", w:2, h:2 };
    setWidgets(p => [...p, w]); setSel(w.id);
  };
  const rm  = (id:string) => { setWidgets(p => p.filter(w => w.id!==id)); if(sel===id) setSel(null); };
  const upd = (id:string, patch:Partial<Widget>) => setWidgets(p => p.map(w => w.id===id ? {...w,...patch} : w));
  const selW = widgets.find(w => w.id===sel);
  const save = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };

  return (
    <div className="gc-page" style={{ height:"100vh", overflow:"hidden" }}>
      <TopNav/>
      <div className="gc-db">
        {/* Palette */}
        <div className="gc-db-palette">
          <div className="gc-fb-section-hdr">Widgets</div>
          {PALETTE.map(({ type, label, icon }) => (
            <div key={type} className="gc-fb-type" onClick={() => add(type)}>
              <span style={{ color:"var(--c-blue)" }}>{icon}</span>{label}
            </div>
          ))}
          <div className="gc-fb-section-hdr" style={{ marginTop:8 }}>Data Sources</div>
          {SOURCES.map(s => (
            <div key={s} className="gc-fb-type" style={{ cursor:"default", fontSize:11 }}>
              <span style={{ color:"var(--c-text-4)", fontSize:8 }}>●</span>{s}
            </div>
          ))}
        </div>

        {/* Canvas */}
        <div className="gc-db-canvas">
          <div style={{ background:"#fff", border:"1px solid var(--c-border)", borderRadius:8, padding:"10px 14px", marginBottom:16, display:"flex", alignItems:"center", gap:10, boxShadow:"var(--shadow-sm)" }}>
            <input value={name} onChange={e => setName(e.target.value)} style={{ flex:1, padding:"6px 10px", fontSize:13, fontWeight:600, border:"1px solid var(--c-border)", borderRadius:4, fontFamily:"inherit" }}/>
            <div style={{ flex:1 }}/>
            <button onClick={save} className={`gc-btn gc-btn-sm ${saved ? "gc-btn-default" : "gc-btn-primary"}`} style={{ gap:5 }}>
              {saved ? <><CheckCircle2 size={12} color="var(--c-success)"/> Saved!</> : <><Save size={12}/> Save</>}
            </button>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, gridAutoRows:"140px" }}>
            {widgets.map(w => (
              <div key={w.id} onClick={() => setSel(w.id)}
                className={`gc-widget ${sel===w.id ? "selected" : ""}`}
                style={{ gridColumn:`span ${Math.min(w.w,4)}`, gridRow:`span ${w.h}` }}>
                <div className="gc-widget-hdr">
                  <span>{w.title}</span>
                  <button onClick={e => { e.stopPropagation(); rm(w.id); }} style={{ background:"none", border:"none", cursor:"pointer", color:"var(--c-text-4)", padding:2 }}><Trash2 size={11}/></button>
                </div>
                <div className="gc-widget-body" style={{ height:`calc(100% - 34px)`, flexDirection:"column", gap:4 }}>
                  {w.type==="stat"
                    ? <><div style={{ fontSize:28, fontWeight:700, color:"var(--c-blue)" }}>{STAT_VALS[w.title] ?? Math.floor(Math.random()*200+10)}</div><div style={{ fontSize:11, color:"var(--c-text-4)" }}>{w.title}</div></>
                    : <>{ICONS[w.type]}<div style={{ fontSize:11, color:"var(--c-text-4)" }}>{w.title}</div></>
                  }
                </div>
              </div>
            ))}
            <div onClick={() => add("stat")}
              style={{ border:"2px dashed var(--c-border)", borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", color:"var(--c-text-4)", cursor:"pointer", minHeight:140, transition:"border-color .15s,color .15s" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor="var(--c-blue)"; (e.currentTarget as HTMLElement).style.color="var(--c-blue)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor="var(--c-border)"; (e.currentTarget as HTMLElement).style.color="var(--c-text-4)"; }}>
              <Plus size={20}/>
            </div>
          </div>
        </div>

        {/* Props */}
        <div className="gc-db-props">
          <div style={{ padding:"10px 12px", borderBottom:"1px solid var(--c-border-light)", display:"flex", alignItems:"center", gap:6 }}>
            <Settings size={13} style={{ color:"var(--c-text-4)" }}/>
            <span style={{ fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:".06em", color:"var(--c-text-4)" }}>Widget Settings</span>
          </div>
          {selW ? (
            <div style={{ padding:12 }}>
              <div className="gc-prop-row">
                <label style={{ fontSize:11, color:"var(--c-text-2)", display:"block", marginBottom:3 }}>Title</label>
                <input className="gc-prop-input" value={selW.title} onChange={e => upd(selW.id,{title:e.target.value})}/>
              </div>
              <div className="gc-prop-row">
                <label style={{ fontSize:11, color:"var(--c-text-2)", display:"block", marginBottom:3 }}>Data Source</label>
                <select className="gc-prop-input" value={selW.source??""} onChange={e => upd(selW.id,{source:e.target.value})}>
                  <option value="">None</option>
                  {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="gc-prop-row">
                <label style={{ fontSize:11, color:"var(--c-text-2)", display:"block", marginBottom:3 }}>Width (cols)</label>
                <input type="range" min={1} max={4} value={selW.w} onChange={e => upd(selW.id,{w:+e.target.value})} style={{ width:"100%", accentColor:"var(--c-blue)" }}/>
                <div style={{ fontSize:11, textAlign:"right", color:"var(--c-text-4)" }}>{selW.w}/4</div>
              </div>
              <div className="gc-prop-row">
                <label style={{ fontSize:11, color:"var(--c-text-2)", display:"block", marginBottom:3 }}>Height (rows)</label>
                <input type="range" min={1} max={4} value={selW.h} onChange={e => upd(selW.id,{h:+e.target.value})} style={{ width:"100%", accentColor:"var(--c-blue)" }}/>
                <div style={{ fontSize:11, textAlign:"right", color:"var(--c-text-4)" }}>{selW.h} rows</div>
              </div>
            </div>
          ) : (
            <div style={{ padding:24, textAlign:"center", color:"var(--c-text-4)", fontSize:12 }}>Click a widget to configure it</div>
          )}
        </div>
      </div>
    </div>
  );
}
