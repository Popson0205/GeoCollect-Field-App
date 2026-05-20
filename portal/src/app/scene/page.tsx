"use client";
import { useRef, useState } from "react";
import TopNav from "@/components/TopNav";
import { Layers, Map as MapIcon, BookOpen, Sun, Cloud, Scissors, Eye, EyeOff, Plus, X, Save, CheckCircle2 } from "lucide-react";

type RailTool = "layers"|"basemap"|"legend"|"slides"|"daylight"|"weather"|"slice";
interface Layer { id:string; name:string; color:string; visible:boolean; }
interface Slide { id:string; label:string; emoji:string; }

const INIT_LAYERS: Layer[] = [
  { id:"l1", name:"Niger Delta Asset Survey", color:"#0079c1", visible:true  },
  { id:"l2", name:"Road Network",             color:"#e65100", visible:true  },
  { id:"l3", name:"Admin Boundaries",         color:"#6a1b9a", visible:false },
];
const SLIDES: Slide[] = [
  { id:"s1", label:"Overview",    emoji:"🌍" },
  { id:"s2", label:"Asset Sites", emoji:"📍" },
  { id:"s3", label:"Road Network",emoji:"🛣️" },
  { id:"s4", label:"Admin Zones", emoji:"🗺️" },
];
const BASEMAPS_3D = [
  { id:"imagery", label:"Imagery",   emoji:"🛰️" },
  { id:"topo",    label:"Topo",      emoji:"⛰️" },
  { id:"streets", label:"Streets",   emoji:"🗺️" },
  { id:"dark",    label:"Dark Gray", emoji:"🌑" },
];
const RAIL: { id:RailTool; icon:React.ReactNode; label:string }[] = [
  { id:"layers",   icon:<Layers size={16}/>,   label:"Layers" },
  { id:"basemap",  icon:<MapIcon size={16}/>,  label:"Basemap" },
  { id:"legend",   icon:<BookOpen size={16}/>, label:"Legend" },
  { id:"slides",   icon:<BookOpen size={16}/>, label:"Slides" },
  { id:"daylight", icon:<Sun size={16}/>,      label:"Daylight" },
  { id:"weather",  icon:<Cloud size={16}/>,    label:"Weather" },
  { id:"slice",    icon:<Scissors size={16}/>, label:"Slice" },
];

export default function SceneViewerPage() {
  const [layers,      setLayers]      = useState<Layer[]>(INIT_LAYERS);
  const [rail,        setRail]        = useState<RailTool|null>("layers");
  const [basemap,     setBasemap]     = useState(BASEMAPS_3D[0]);
  const [tilt,        setTilt]        = useState(45);
  const [hour,        setHour]        = useState(12);
  const [saved,       setSaved]       = useState(false);
  const [title,       setTitle]       = useState("Niger Delta 3D Scene");
  const [activeSlide, setActiveSlide] = useState("s1");

  const toggleLayer = (id:string) => setLayers(p => p.map(l => l.id===id ? {...l,visible:!l.visible} : l));
  const toggleRail  = (t:RailTool) => setRail(prev => prev===t ? null : t);
  const save = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };

  return (
    <div className="gc-page" style={{ height:"100vh", overflow:"hidden" }}>
      <TopNav/>
      <div className="gc-mv">
        <div className="gc-mv-toolbar">
          <input className="gc-mv-title-input" value={title} onChange={e => setTitle(e.target.value)}/>
          <div className="gc-mv-toolbar-divider"/>
          <button className="gc-btn gc-btn-default gc-btn-sm" style={{ gap:5 }} onClick={save}>
            {saved ? <><CheckCircle2 size={12} color="var(--c-success)"/> Saved!</> : <><Save size={12}/> Save</>}
          </button>
          <span style={{ fontSize:12, color:"var(--c-text-4)", marginLeft:8 }}>3D Scene Viewer</span>
        </div>
        <div className="gc-mv-body">
          <div className="gc-mv-rail">
            {RAIL.map(({ id, icon, label }) => (
              <button key={id} className={`gc-mv-rail-btn ${rail===id ? "active" : ""}`} onClick={() => toggleRail(id)} title={label}>{icon}</button>
            ))}
          </div>
          <div className={`gc-mv-panel ${rail ? "" : "closed"}`} style={{ minWidth: rail ? 280 : 0 }}>
            {rail && (
              <>
                <div className="gc-mv-panel-hdr">
                  <span>{RAIL.find(r => r.id===rail)?.label}</span>
                  <button className="gc-btn gc-btn-ghost gc-btn-icon" onClick={() => setRail(null)}><X size={13}/></button>
                </div>
                <div className="gc-mv-panel-body">
                  {rail === "layers" && (
                    <div>
                      {layers.map(l => (
                        <div key={l.id} className="gc-layer-row">
                          <div className="gc-layer-dot" style={{ background: l.color }}/>
                          <span className="gc-layer-name">{l.name}</span>
                          <div className="gc-layer-actions">
                            <button className="gc-btn gc-btn-ghost gc-btn-icon" onClick={() => toggleLayer(l.id)}>
                              {l.visible ? <Eye size={12}/> : <EyeOff size={12}/>}
                            </button>
                          </div>
                        </div>
                      ))}
                      <div style={{ padding:"8px 12px" }}>
                        <button className="gc-btn gc-btn-default gc-btn-sm" style={{ gap:5 }}><Plus size={12}/> Add Layer</button>
                      </div>
                    </div>
                  )}
                  {rail === "basemap" && (
                    <div className="gc-basemap-grid" style={{ gridTemplateColumns:"repeat(2,1fr)" }}>
                      {BASEMAPS_3D.map(bm => (
                        <div key={bm.id} className={`gc-basemap-item ${basemap.id===bm.id ? "active" : ""}`} onClick={() => setBasemap(bm)}>
                          <div className="gc-basemap-thumb" style={{ background: bm.id==="dark"||bm.id==="imagery" ? "#1a1a2e" : "#e8eff7" }}>{bm.emoji}</div>
                          <div className="gc-basemap-label">{bm.label}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  {rail === "slides" && (
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, padding:12 }}>
                      {SLIDES.map(s => (
                        <div key={s.id} onClick={() => setActiveSlide(s.id)}
                          style={{ border:`2px solid ${activeSlide===s.id ? "var(--c-blue)" : "var(--c-border)"}`, borderRadius:6, overflow:"hidden", cursor:"pointer", transition:"border-color .15s" }}>
                          <div style={{ height:64, background:"linear-gradient(135deg,#c8dff0,#a8c8e0)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:24 }}>{s.emoji}</div>
                          <div style={{ padding:"5px 8px", fontSize:11, fontWeight:500, color:"var(--c-text-2)" }}>{s.label}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  {rail === "daylight" && (
                    <div style={{ padding:14 }}>
                      <div style={{ position:"relative", height:80, background:"linear-gradient(180deg,#87ceeb,#ffd700)", borderRadius:8, marginBottom:14, overflow:"hidden" }}>
                        <div style={{ position:"absolute", left:`calc(50% + ${Math.cos((hour/24)*Math.PI*2)*40}px)`, top:`calc(50% + ${-Math.abs(Math.sin((hour/24)*Math.PI*2))*30-10}px)`, fontSize:20 }}>☀️</div>
                      </div>
                      <div className="gc-prop-row">
                        <label style={{ fontSize:12, color:"var(--c-text-2)", display:"block", marginBottom:4 }}>Hour of Day: {hour}:00</label>
                        <input type="range" min={0} max={23} value={hour} onChange={e => setHour(+e.target.value)} style={{ width:"100%", accentColor:"var(--c-blue)" }}/>
                      </div>
                      <div style={{ display:"flex", gap:4, marginTop:8 }}>
                        {["Jan","Apr","Jul","Oct"].map(m => <button key={m} className="gc-btn gc-btn-default gc-btn-xs">{m}</button>)}
                      </div>
                    </div>
                  )}
                  {rail === "weather" && (
                    <div style={{ padding:14 }}>
                      <div className="gc-prop-row">
                        <label style={{ fontSize:12, color:"var(--c-text-2)", display:"block", marginBottom:4 }}>Weather Condition</label>
                        <select className="gc-prop-input"><option>Clear</option><option>Cloudy</option><option>Rainy</option><option>Foggy</option><option>Snowy</option></select>
                      </div>
                      <div className="gc-prop-row" style={{ marginTop:10 }}>
                        <label style={{ fontSize:12, color:"var(--c-text-2)", display:"block", marginBottom:4 }}>Cloud Cover</label>
                        <input type="range" min={0} max={100} defaultValue={20} style={{ width:"100%", accentColor:"var(--c-blue)" }}/>
                      </div>
                    </div>
                  )}
                  {rail === "slice" && (
                    <div style={{ padding:14 }}>
                      <div style={{ fontSize:12, color:"var(--c-text-3)", marginBottom:12 }}>Use the slice tool to cut through 3D objects and see inside.</div>
                      <button className="gc-btn gc-btn-primary gc-btn-sm" style={{ width:"100%", justifyContent:"center", gap:5 }}><Scissors size={12}/> Activate Slice</button>
                    </div>
                  )}
                  {rail === "legend" && (
                    <div style={{ padding:12 }}>
                      {layers.filter(l => l.visible).map(l => (
                        <div key={l.id} style={{ marginBottom:12 }}>
                          <div style={{ fontSize:12, fontWeight:600, color:"var(--c-text-2)", marginBottom:5 }}>{l.name}</div>
                          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                            <div style={{ width:14, height:14, borderRadius:2, background:l.color }}/>
                            <span style={{ fontSize:11, color:"var(--c-text-3)" }}>All features</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* 3D canvas */}
          <div className="gc-scene-canvas">
            <div style={{ position:"absolute", inset:0, background:`linear-gradient(180deg, ${hour<6||hour>18 ? "#1a2a3a" : "#87ceeb"} 0%, #d4e8c2 55%, #8b7355 75%, #6b5a3e 100%)`, pointerEvents:"none" }}>
              <div style={{ position:"absolute", bottom:"25%", left:"10%", right:"10%", height:2, background:"rgba(139,115,85,0.5)", borderRadius:1 }}/>
              <div style={{ position:"absolute", bottom:"35%", left:"20%", width:80, height:60, background:"rgba(100,80,60,0.3)", borderRadius:"50% 50% 0 0", transform:"scaleY(0.4)" }}/>
              <div style={{ position:"absolute", bottom:"35%", right:"25%", width:100, height:80, background:"rgba(100,80,60,0.25)", borderRadius:"50% 50% 0 0", transform:"scaleY(0.4)" }}/>
              <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", color:"rgba(0,121,193,0.25)", fontSize:13, fontWeight:500, letterSpacing:".1em", textTransform:"uppercase" }}>
                3D Scene · {basemap.label} · Tilt {tilt}°
              </div>
            </div>
            <div className="gc-compass">🧭</div>
            <div className="gc-tilt-control">
              <span style={{ fontSize:10, color:"var(--c-text-4)", fontWeight:600 }}>TILT</span>
              <input type="range" min={0} max={90} value={tilt} onChange={e => setTilt(+e.target.value)}
                style={{ writingMode:"vertical-lr", height:80, accentColor:"var(--c-blue)" }}/>
              <span style={{ fontSize:10, color:"var(--c-text-4)" }}>{tilt}°</span>
              <div style={{ height:1, background:"var(--c-border-light)", width:"100%", margin:"4px 0" }}/>
              <button className="gc-mv-rail-btn"><Plus size={14}/></button>
              <button className="gc-mv-rail-btn" style={{ fontSize:18, fontWeight:700, lineHeight:1 }}>−</button>
            </div>
            <div className="gc-mv-status">
              <span>5.50°N, 6.25°E</span><span>·</span>
              <span>Altitude 4,200 m</span><span>·</span>
              <span>Tilt {tilt}°</span><span>·</span><span>WGS 1984</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
