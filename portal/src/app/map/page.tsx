"use client";
import { useEffect, useRef, useState } from "react";
import TopNav from "@/components/TopNav";
import {
  Layers, Map as MapIcon, BookOpen, Search, Printer, Ruler, PenLine,
  Eye, EyeOff, Trash2, Plus, ChevronDown, Save, Share2, Undo2, Redo2,
  Maximize2, Minimize2, CheckCircle2, X, Sparkles, ZoomIn, ZoomOut,
} from "lucide-react";

type RailTool = "layers"|"basemap"|"legend"|"bookmarks"|"search"|"print"|"measure"|"sketch"|"analysis";
type PropTab  = "styles"|"popups"|"labels"|"filters"|"effects"|"aggregation";
interface Layer { id:string; name:string; color:string; visible:boolean; opacity:number; }

const INIT_LAYERS: Layer[] = [
  { id:"l1", name:"Niger Delta Asset Survey",    color:"#0079c1", visible:true,  opacity:100 },
  { id:"l2", name:"Road Network",                color:"#e65100", visible:true,  opacity:80  },
  { id:"l3", name:"Admin Boundaries",            color:"#6a1b9a", visible:false, opacity:100 },
  { id:"l4", name:"NCFRMI Field Survey Layer",   color:"#2e7d32", visible:true,  opacity:90  },
];
const BASEMAPS = [
  { id:"streets",   label:"Streets",    emoji:"🗺️", url:"https://basemaps.cartocdn.com/gl/positron-gl-style/style.json" },
  { id:"satellite", label:"Imagery",    emoji:"🛰️", url:"https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json" },
  { id:"topo",      label:"Topo",       emoji:"⛰️", url:"https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json" },
  { id:"dark",      label:"Dark Gray",  emoji:"🌑", url:"https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json" },
  { id:"light",     label:"Light Gray", emoji:"⬜", url:"https://basemaps.cartocdn.com/gl/positron-gl-style/style.json" },
  { id:"ocean",     label:"Ocean",      emoji:"🌊", url:"https://basemaps.cartocdn.com/gl/positron-gl-style/style.json" },
  { id:"natgeo",    label:"Nat Geo",    emoji:"🌍", url:"https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json" },
  { id:"terrain",   label:"Terrain",    emoji:"🏔️", url:"https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json" },
  { id:"canvas",    label:"Canvas",     emoji:"📐", url:"https://basemaps.cartocdn.com/gl/positron-gl-style/style.json" },
];
const RENDERERS   = ["Simple","Unique Values","Graduated Colors","Graduated Symbols","Heat Map","Dot Density"];
const ANALYSIS_TOOLS = ["Buffer","Clip","Dissolve","Spatial Join","Summarize Within","Find Hot Spots","Kernel Density","Create Viewshed","Interpolate Points","Enrich Layer"];
const RAIL: { id:RailTool; icon:React.ReactNode; label:string }[] = [
  { id:"layers",   icon:<Layers size={16}/>,   label:"Layers" },
  { id:"basemap",  icon:<MapIcon size={16}/>,  label:"Basemap" },
  { id:"legend",   icon:<BookOpen size={16}/>, label:"Legend" },
  { id:"search",   icon:<Search size={16}/>,   label:"Search" },
  { id:"print",    icon:<Printer size={16}/>,  label:"Print" },
  { id:"measure",  icon:<Ruler size={16}/>,    label:"Measure" },
  { id:"sketch",   icon:<PenLine size={16}/>,  label:"Sketch" },
  { id:"analysis", icon:<Sparkles size={16}/>, label:"Analysis" },
];
const PROP_TABS: { id:PropTab; label:string }[] = [
  { id:"styles",      label:"Styles" },
  { id:"popups",      label:"Pop-ups" },
  { id:"labels",      label:"Labels" },
  { id:"filters",     label:"Filters" },
  { id:"effects",     label:"Effects" },
  { id:"aggregation", label:"Aggregation" },
];

export default function MapViewerPage() {
  const mapRef  = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInst = useRef<any>(null);
  const [layers,    setLayers]    = useState<Layer[]>(INIT_LAYERS);
  const [basemap,   setBasemap]   = useState(BASEMAPS[0]);
  const [railTool,  setRailTool]  = useState<RailTool|null>("layers");
  const [propTab,   setPropTab]   = useState<PropTab>("styles");
  const [showProps, setShowProps] = useState(true);
  const [mapTitle,  setMapTitle]  = useState("Niger Delta Power Holding Asset Map");
  const [saved,     setSaved]     = useState(false);
  const [coords,    setCoords]    = useState({ lng:6.25, lat:5.50 });
  const [zoom,      setZoom]      = useState(9);
  const [selLayer,  setSelLayer]  = useState<string>(INIT_LAYERS[0].id);
  const [searchQ,   setSearchQ]   = useState("");

  useEffect(() => {
    if (!mapRef.current) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let m: any = null;
    import("maplibre-gl").then(ml => {
      m = new ml.Map({ container: mapRef.current!, style: basemap.url, center:[6.25,5.50], zoom:9 });
      m.addControl(new ml.NavigationControl(), "bottom-right");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      m.on("mousemove", (e:any) => setCoords({ lng:+e.lngLat.lng.toFixed(4), lat:+e.lngLat.lat.toFixed(4) }));
      m.on("zoom", () => setZoom(+m.getZoom().toFixed(1)));
      mapInst.current = m;
    }).catch(() => {});
    return () => { m?.remove(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { mapInst.current?.setStyle(basemap.url); }, [basemap]);

  const toggleLayer = (id:string) => setLayers(p => p.map(l => l.id===id ? {...l,visible:!l.visible} : l));
  const removeLayer = (id:string) => setLayers(p => p.filter(l => l.id!==id));
  const toggleRail  = (t:RailTool) => setRailTool(prev => prev===t ? null : t);
  const save = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };
  const panelOpen = railTool !== null;

  return (
    <div className="gc-page" style={{ height:"100vh", overflow:"hidden" }}>
      <TopNav/>
      <div className="gc-mv">
        {/* Toolbar */}
        <div className="gc-mv-toolbar">
          <input className="gc-mv-title-input" value={mapTitle} onChange={e => setMapTitle(e.target.value)}/>
          <div className="gc-mv-toolbar-divider"/>
          <button className="gc-btn gc-btn-default gc-btn-sm" style={{ gap:5 }} onClick={save}>
            {saved ? <><CheckCircle2 size={12} color="var(--c-success)"/> Saved!</> : <><Save size={12}/> Save</>}
          </button>
          <button className="gc-btn gc-btn-ghost gc-btn-sm" style={{ gap:5 }}><ChevronDown size={12}/> Save As</button>
          <div className="gc-mv-toolbar-divider"/>
          <button className="gc-btn gc-btn-ghost gc-btn-sm" style={{ gap:5 }}><Share2 size={12}/> Share</button>
          <button className="gc-btn gc-btn-ghost gc-btn-sm" style={{ gap:5 }}><Printer size={12}/> Print</button>
          <div className="gc-mv-toolbar-divider"/>
          <button className="gc-btn gc-btn-ghost gc-btn-icon" title="Undo"><Undo2 size={14}/></button>
          <button className="gc-btn gc-btn-ghost gc-btn-icon" title="Redo"><Redo2 size={14}/></button>
          <div className="gc-mv-toolbar-divider"/>
          <button className="gc-btn gc-btn-ghost gc-btn-icon" title="Zoom In"><ZoomIn size={14}/></button>
          <button className="gc-btn gc-btn-ghost gc-btn-icon" title="Zoom Out"><ZoomOut size={14}/></button>
          <div className="gc-mv-toolbar-divider"/>
          <button className="gc-btn gc-btn-ghost gc-btn-icon" onClick={() => setShowProps(!showProps)} title="Toggle properties">
            {showProps ? <Minimize2 size={14}/> : <Maximize2 size={14}/>}
          </button>
        </div>

        <div className="gc-mv-body">
          {/* Rail */}
          <div className="gc-mv-rail">
            {RAIL.map(({ id, icon, label }) => (
              <button key={id} className={`gc-mv-rail-btn ${railTool===id ? "active" : ""}`}
                onClick={() => toggleRail(id)} title={label}>{icon}</button>
            ))}
          </div>

          {/* Left panel */}
          <div className={`gc-mv-panel ${panelOpen ? "" : "closed"}`} style={{ minWidth: panelOpen ? 280 : 0 }}>
            {panelOpen && (
              <>
                <div className="gc-mv-panel-hdr">
                  <span>{RAIL.find(r => r.id===railTool)?.label ?? ""}</span>
                  <button className="gc-btn gc-btn-ghost gc-btn-icon" onClick={() => setRailTool(null)}><X size={13}/></button>
                </div>
                <div className="gc-mv-panel-body">
                  {railTool === "layers" && (
                    <div>
                      <div style={{ padding:"8px 12px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                        <span style={{ fontSize:11, color:"var(--c-text-4)", fontWeight:600, textTransform:"uppercase", letterSpacing:".06em" }}>Layers ({layers.length})</span>
                        <button className="gc-btn gc-btn-ghost gc-btn-icon" title="Add layer"><Plus size={13}/></button>
                      </div>
                      {layers.map(l => (
                        <div key={l.id} className="gc-layer-row"
                          style={{ background: selLayer===l.id ? "var(--c-blue-light)" : undefined }}
                          onClick={() => { setSelLayer(l.id); setShowProps(true); }}>
                          <div className="gc-layer-dot" style={{ background: l.color }}/>
                          <span className="gc-layer-name">{l.name}</span>
                          <div className="gc-layer-actions">
                            <button className="gc-btn gc-btn-ghost gc-btn-icon" onClick={e => { e.stopPropagation(); toggleLayer(l.id); }}>
                              {l.visible ? <Eye size={12}/> : <EyeOff size={12}/>}
                            </button>
                            <button className="gc-btn gc-btn-ghost gc-btn-icon" onClick={e => { e.stopPropagation(); removeLayer(l.id); }}>
                              <Trash2 size={11}/>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {railTool === "basemap" && (
                    <div className="gc-basemap-grid">
                      {BASEMAPS.map(bm => (
                        <div key={bm.id} className={`gc-basemap-item ${basemap.id===bm.id ? "active" : ""}`} onClick={() => setBasemap(bm)}>
                          <div className="gc-basemap-thumb" style={{ background: bm.id==="dark"||bm.id==="satellite" ? "#1a1a2e" : bm.id==="ocean" ? "#1a3a5c" : "#e8eff7" }}>{bm.emoji}</div>
                          <div className="gc-basemap-label">{bm.label}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  {railTool === "legend" && (
                    <div style={{ padding:12 }}>
                      {layers.filter(l => l.visible).map(l => (
                        <div key={l.id} style={{ marginBottom:14 }}>
                          <div style={{ fontSize:12, fontWeight:600, color:"var(--c-text-2)", marginBottom:6 }}>{l.name}</div>
                          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                            <div style={{ width:16, height:16, borderRadius:3, background:l.color, flexShrink:0 }}/>
                            <span style={{ fontSize:11, color:"var(--c-text-3)" }}>All features</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {railTool === "search" && (
                    <div style={{ padding:12 }}>
                      <div style={{ position:"relative", marginBottom:12 }}>
                        <Search size={13} style={{ position:"absolute", left:9, top:"50%", transform:"translateY(-50%)", color:"var(--c-text-4)", pointerEvents:"none" }}/>
                        <input className="gc-input" placeholder="Search places…" value={searchQ} onChange={e => setSearchQ(e.target.value)} style={{ paddingLeft:30 }}/>
                      </div>
                      {searchQ && <div style={{ fontSize:12, color:"var(--c-text-3)", padding:"4px 4px" }}>No results for "{searchQ}"</div>}
                    </div>
                  )}
                  {railTool === "measure" && (
                    <div style={{ padding:12 }}>
                      <div style={{ fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:".06em", color:"var(--c-text-4)", marginBottom:10 }}>Measurement Tools</div>
                      {["Measure Distance","Measure Area","Measure Feature"].map(t => (
                        <button key={t} className="gc-btn gc-btn-default gc-btn-sm" style={{ display:"flex", width:"100%", marginBottom:6, gap:6 }}>
                          <Ruler size={12}/> {t}
                        </button>
                      ))}
                    </div>
                  )}
                  {railTool === "sketch" && (
                    <div style={{ padding:12 }}>
                      <div style={{ fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:".06em", color:"var(--c-text-4)", marginBottom:10 }}>Sketch Tools</div>
                      {["Point","Polyline","Polygon","Rectangle","Circle","Text"].map(t => (
                        <button key={t} className="gc-btn gc-btn-default gc-btn-sm" style={{ display:"flex", width:"100%", marginBottom:6, gap:6 }}>
                          <PenLine size={12}/> {t}
                        </button>
                      ))}
                    </div>
                  )}
                  {railTool === "print" && (
                    <div style={{ padding:12 }}>
                      <div style={{ fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:".06em", color:"var(--c-text-4)", marginBottom:10 }}>Print Settings</div>
                      <div className="gc-prop-row"><label style={{ fontSize:12, color:"var(--c-text-2)", display:"block", marginBottom:3 }}>Layout</label>
                        <select className="gc-prop-input"><option>A4 Landscape</option><option>A4 Portrait</option><option>Letter Landscape</option><option>Letter Portrait</option></select>
                      </div>
                      <div className="gc-prop-row"><label style={{ fontSize:12, color:"var(--c-text-2)", display:"block", marginBottom:3 }}>Scale</label>
                        <select className="gc-prop-input"><option>Current extent</option><option>1:1,000</option><option>1:5,000</option><option>1:25,000</option></select>
                      </div>
                      <button className="gc-btn gc-btn-primary gc-btn-sm" style={{ width:"100%", justifyContent:"center", gap:5 }}><Printer size={12}/> Export PDF</button>
                    </div>
                  )}
                  {railTool === "analysis" && (
                    <div style={{ padding:12 }}>
                      <div style={{ fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:".06em", color:"var(--c-text-4)", marginBottom:10 }}>Spatial Analysis</div>
                      {ANALYSIS_TOOLS.map(t => (
                        <button key={t} style={{ display:"block", width:"100%", textAlign:"left", padding:"8px 10px", fontSize:12, color:"var(--c-text-2)", background:"none", border:"none", cursor:"pointer", borderRadius:4, transition:"background .12s" }}
                          onMouseEnter={e => (e.currentTarget.style.background = "var(--c-blue-light)")}
                          onMouseLeave={e => (e.currentTarget.style.background = "none")}>
                          {t}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Map canvas */}
          <div className="gc-mv-canvas">
            <div ref={mapRef} style={{ width:"100%", height:"100%" }}>
              <div style={{ position:"absolute", inset:0, background:"linear-gradient(180deg,#c8dff0 0%,#a8c8e0 40%,#8fb8d0 100%)", display:"flex", alignItems:"center", justifyContent:"center", pointerEvents:"none" }}>
                <div style={{ textAlign:"center", color:"rgba(0,121,193,0.4)" }}>
                  <div style={{ fontSize:56 }}>🗺️</div>
                  <div style={{ fontSize:13, fontWeight:500, marginTop:6 }}>Map Viewer</div>
                  <div style={{ fontSize:11, opacity:.7 }}>MapLibre GL renders here</div>
                </div>
              </div>
            </div>
            <div className="gc-mv-status">
              <span>{coords.lat}°N, {coords.lng}°E</span>
              <span>·</span><span>Zoom {zoom}</span>
              <span>·</span><span>WGS 1984</span>
              <span style={{ marginLeft:"auto" }}>Scale 1:{Math.round(591657550.5/Math.pow(2,zoom)).toLocaleString()}</span>
            </div>
          </div>

          {/* Properties panel */}
          <div className={`gc-mv-props ${showProps ? "" : "closed"}`} style={{ minWidth: showProps ? 300 : 0 }}>
            {showProps && (
              <>
                <div style={{ padding:"10px 14px 0", display:"flex", alignItems:"center", justifyContent:"space-between", borderBottom:"1px solid var(--c-border-light)" }}>
                  <div style={{ fontSize:12, fontWeight:600, color:"var(--c-text-2)" }}>
                    {layers.find(l => l.id===selLayer)?.name ?? "Properties"}
                  </div>
                  <button className="gc-btn gc-btn-ghost gc-btn-icon" onClick={() => setShowProps(false)}><X size={13}/></button>
                </div>
                <div className="gc-mv-props-tabs">
                  {PROP_TABS.map(t => (
                    <button key={t.id} onClick={() => setPropTab(t.id)} className={`gc-mv-props-tab ${propTab===t.id ? "active" : ""}`}>{t.label}</button>
                  ))}
                </div>
                <div className="gc-mv-props-body">
                  {propTab === "styles" && (
                    <>
                      <div className="gc-prop-group">
                        <div className="gc-prop-label">Renderer</div>
                        <select className="gc-prop-input">{RENDERERS.map(r => <option key={r}>{r}</option>)}</select>
                      </div>
                      <div className="gc-prop-group">
                        <div className="gc-prop-label">Symbol</div>
                        <div className="gc-prop-row">
                          <label>Color</label>
                          <input type="color" defaultValue={layers.find(l=>l.id===selLayer)?.color ?? "#0079c1"} style={{ width:"100%", height:32, borderRadius:4, border:"1px solid var(--c-border)", cursor:"pointer" }}/>
                        </div>
                        <div className="gc-prop-row">
                          <label>Size</label>
                          <input type="range" min={4} max={24} defaultValue={8} style={{ width:"100%", accentColor:"var(--c-blue)" }}/>
                        </div>
                        <div className="gc-prop-row">
                          <label>Opacity ({layers.find(l=>l.id===selLayer)?.opacity ?? 100}%)</label>
                          <input type="range" min={0} max={100} value={layers.find(l=>l.id===selLayer)?.opacity ?? 100}
                            onChange={e => setLayers(p => p.map(l => l.id===selLayer ? {...l,opacity:+e.target.value} : l))}
                            style={{ width:"100%", accentColor:"var(--c-blue)" }}/>
                        </div>
                      </div>
                      <div className="gc-prop-group">
                        <div className="gc-prop-label">Color Ramp</div>
                        <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
                          {["#0079c1","#e65100","#2e7d32","#6a1b9a","#c62828","#f9a825"].map(c => (
                            <div key={c} style={{ width:24, height:24, borderRadius:3, background:c, cursor:"pointer", border:"2px solid transparent" }}
                              onClick={() => setLayers(p => p.map(l => l.id===selLayer ? {...l,color:c} : l))}/>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                  {propTab === "popups" && (
                    <div className="gc-prop-group">
                      <div className="gc-prop-label">Pop-up Fields</div>
                      {["OBJECTID","name","status","area_m2","created_date","collector"].map(f => (
                        <label key={f} style={{ display:"flex", alignItems:"center", gap:8, padding:"5px 0", fontSize:12, cursor:"pointer" }}>
                          <input type="checkbox" defaultChecked={f!=="OBJECTID"} style={{ accentColor:"var(--c-blue)" }}/> {f}
                        </label>
                      ))}
                    </div>
                  )}
                  {propTab === "labels" && (
                    <div>
                      <div className="gc-prop-group">
                        <div className="gc-prop-label">Enable Labels</div>
                        <label style={{ display:"flex", alignItems:"center", gap:8, fontSize:12, cursor:"pointer" }}>
                          <input type="checkbox" style={{ accentColor:"var(--c-blue)" }}/> Show labels on map
                        </label>
                      </div>
                      <div className="gc-prop-group">
                        <div className="gc-prop-label">Label Field</div>
                        <select className="gc-prop-input"><option>name</option><option>status</option><option>OBJECTID</option></select>
                      </div>
                    </div>
                  )}
                  {propTab === "filters" && (
                    <div className="gc-prop-group">
                      <div className="gc-prop-label">Filter Expression</div>
                      <div className="gc-prop-row"><label>Field</label><select className="gc-prop-input"><option>status</option><option>name</option><option>area_m2</option></select></div>
                      <div className="gc-prop-row"><label>Operator</label><select className="gc-prop-input"><option>is</option><option>is not</option><option>contains</option></select></div>
                      <div className="gc-prop-row"><label>Value</label><input className="gc-prop-input" placeholder="active"/></div>
                      <button className="gc-btn gc-btn-primary gc-btn-sm" style={{ width:"100%", justifyContent:"center" }}>Apply Filter</button>
                    </div>
                  )}
                  {(propTab === "effects" || propTab === "aggregation") && (
                    <div style={{ textAlign:"center", padding:24, color:"var(--c-text-4)", fontSize:12 }}>
                      Configure {propTab} settings for the selected layer.
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
