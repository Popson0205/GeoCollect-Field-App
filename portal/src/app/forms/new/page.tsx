"use client";
import { useState } from "react";
import TopNav from "@/components/TopNav";
import { GripVertical, Plus, Trash2, Settings, Eye, Send, CheckCircle2, Copy } from "lucide-react";
import type { FieldDef, GeometryType } from "@/types";

const PALETTE = [
  { type:"text",      label:"Short Text",  icon:"T" },
  { type:"number",    label:"Number",      icon:"#" },
  { type:"select",    label:"Select",      icon:"☰" },
  { type:"date",      label:"Date",        icon:"📅" },
  { type:"photo",     label:"Photo",       icon:"📷" },
  { type:"boolean",   label:"Yes / No",    icon:"✓" },
  { type:"rating",    label:"Rating",      icon:"★" },
  { type:"geopoint",  label:"Location",    icon:"📍" },
  { type:"calculated",label:"Calculated",  icon:"Σ" },
  { type:"barcode",   label:"Barcode",     icon:"▦" },
];
const GEO_TYPES: { value:GeometryType; label:string }[] = [
  { value:"Point",      label:"Point" },
  { value:"LineString", label:"Line" },
  { value:"Polygon",    label:"Polygon" },
];

function mkField(type:string): FieldDef {
  return { id:crypto.randomUUID(), key:`field_${Date.now()}`, label:`New ${type} field`, type:type as FieldDef["type"], required:false };
}

export default function FormBuilderPage() {
  const [name,   setName]   = useState("Untitled Form");
  const [geo,    setGeo]    = useState<GeometryType>("Point");
  const [fields, setFields] = useState<FieldDef[]>([]);
  const [sel,    setSel]    = useState<string|null>(null);
  const [over,   setOver]   = useState(false);
  const [pub,    setPub]    = useState(false);
  const [preview,setPreview]= useState(false);

  const add = (type:string) => { const f=mkField(type); setFields(p=>[...p,f]); setSel(f.id); };
  const rm  = (id:string)   => { setFields(p=>p.filter(f=>f.id!==id)); if(sel===id) setSel(null); };
  const upd = (id:string, patch:Partial<FieldDef>) => setFields(p=>p.map(f=>f.id===id?{...f,...patch}:f));
  const selF = fields.find(f=>f.id===sel);

  const shareUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/collect/public/demo-token`;

  return (
    <div className="gc-page" style={{ height:"100vh", overflow:"hidden" }}>
      <TopNav/>
      <div className="gc-fb">
        {/* Palette */}
        <div className="gc-fb-palette">
          <div className="gc-fb-section-hdr">Question Types</div>
          {PALETTE.map(({ type, label, icon }) => (
            <div key={type} className="gc-fb-type" draggable
              onDragStart={e => e.dataTransfer.setData("ft", type)}
              onClick={() => add(type)}>
              <span className="gc-fb-type-icon">{icon}</span>{label}
            </div>
          ))}
          <div className="gc-fb-section-hdr" style={{ marginTop:8 }}>Geometry</div>
          {GEO_TYPES.map(g => (
            <div key={g.value} className="gc-fb-type" onClick={() => setGeo(g.value)}>
              <span className="gc-fb-type-icon" style={{ background:geo===g.value?"var(--c-blue)":"var(--c-blue-light)", color:geo===g.value?"#fff":"var(--c-blue)" }}>📍</span>
              {g.label}
            </div>
          ))}
        </div>

        {/* Canvas */}
        <div className="gc-fb-canvas">
          {/* Toolbar */}
          <div style={{ background:"#fff", border:"1px solid var(--c-border)", borderRadius:8, padding:"10px 14px", marginBottom:16, display:"flex", alignItems:"center", gap:10, boxShadow:"var(--shadow-sm)" }}>
            <input value={name} onChange={e => setName(e.target.value)} style={{ flex:1, maxWidth:280, padding:"6px 10px", fontSize:13, fontWeight:600, border:"1px solid var(--c-border)", borderRadius:4, fontFamily:"inherit" }}/>
            <span style={{ fontSize:11, color:"var(--c-text-4)" }}>Geometry: <b style={{ color:"var(--c-blue)" }}>{geo}</b></span>
            <span style={{ fontSize:11, color:"var(--c-text-4)" }}>{fields.length} fields</span>
            <div style={{ flex:1 }}/>
            <button className="gc-btn gc-btn-default gc-btn-sm" style={{ gap:5 }} onClick={() => setPreview(!preview)}>
              <Eye size={12}/> {preview ? "Edit" : "Preview"}
            </button>
            <button onClick={() => setPub(true)} disabled={fields.length===0||pub}
              className={`gc-btn gc-btn-sm ${pub ? "gc-btn-default" : "gc-btn-primary"}`} style={{ gap:5 }}>
              {pub ? <><CheckCircle2 size={12} color="var(--c-success)"/> Published</> : <><Send size={12}/> Publish</>}
            </button>
          </div>

          {pub && (
            <div style={{ background:"#e8f5e9", border:"1px solid #a5d6a7", borderRadius:6, padding:"10px 14px", marginBottom:12, fontSize:12, color:"#2e7d32", display:"flex", alignItems:"center", gap:8 }}>
              <CheckCircle2 size={14}/>
              <span>Form published! Feature Layer and Map auto-created in Content.</span>
              <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:6 }}>
                <span style={{ fontFamily:"monospace", fontSize:11, background:"rgba(0,0,0,0.06)", padding:"2px 6px", borderRadius:3 }}>{shareUrl}</span>
                <button className="gc-btn gc-btn-default gc-btn-xs" style={{ gap:4 }} onClick={() => navigator.clipboard?.writeText(shareUrl)}><Copy size={10}/> Copy</button>
              </div>
            </div>
          )}

          {!preview ? (
            <div style={{ maxWidth:560, margin:"0 auto" }}
              onDragOver={e => { e.preventDefault(); setOver(true); }}
              onDragLeave={() => setOver(false)}
              onDrop={e => { e.preventDefault(); const t=e.dataTransfer.getData("ft"); if(t)add(t); setOver(false); }}>
              {fields.length===0 ? (
                <div className={`gc-fb-dropzone ${over ? "over" : ""}`}>
                  <div style={{ fontSize:28, marginBottom:8 }}>+</div>
                  <div>Drag question types here or click a type on the left</div>
                </div>
              ) : (
                <div>
                  {fields.map(f => (
                    <div key={f.id} className={`gc-fb-field ${sel===f.id ? "selected" : ""}`} onClick={() => setSel(f.id)}>
                      <GripVertical size={14} style={{ color:"var(--c-text-4)", flexShrink:0, cursor:"grab" }}/>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div className="gc-fb-field-label">{f.label}</div>
                        <div className="gc-fb-field-type">{f.type}{f.required ? " · required" : ""}</div>
                      </div>
                      <button onClick={e => { e.stopPropagation(); rm(f.id); }} style={{ background:"none", border:"none", cursor:"pointer", color:"var(--c-text-4)", padding:4 }}><Trash2 size={13}/></button>
                    </div>
                  ))}
                  <div className={`gc-fb-dropzone ${over ? "over" : ""}`} style={{ padding:14, marginTop:8 }}>Drop more fields here</div>
                </div>
              )}
            </div>
          ) : (
            /* Preview mode */
            <div style={{ maxWidth:560, margin:"0 auto", background:"#fff", border:"1px solid var(--c-border)", borderRadius:8, padding:24, boxShadow:"var(--shadow-sm)" }}>
              <h2 style={{ fontSize:18, fontWeight:600, marginBottom:6 }}>{name}</h2>
              <p style={{ fontSize:12, color:"var(--c-text-4)", marginBottom:20 }}>Geometry: {geo}</p>
              {fields.map(f => (
                <div key={f.id} style={{ marginBottom:16 }}>
                  <label style={{ display:"block", fontSize:13, fontWeight:500, marginBottom:5 }}>
                    {f.label}{f.required && <span style={{ color:"var(--c-danger)", marginLeft:3 }}>*</span>}
                  </label>
                  {f.type==="boolean" ? (
                    <div style={{ display:"flex", gap:12 }}>
                      <label style={{ display:"flex", alignItems:"center", gap:6, fontSize:13 }}><input type="radio" name={f.id}/> Yes</label>
                      <label style={{ display:"flex", alignItems:"center", gap:6, fontSize:13 }}><input type="radio" name={f.id}/> No</label>
                    </div>
                  ) : f.type==="select" ? (
                    <select className="gc-prop-input" style={{ width:"100%" }}><option>Select an option</option></select>
                  ) : f.type==="photo" ? (
                    <div style={{ border:"2px dashed var(--c-border)", borderRadius:6, padding:"20px", textAlign:"center", color:"var(--c-text-4)", fontSize:12 }}>📷 Tap to add photo</div>
                  ) : f.type==="rating" ? (
                    <div style={{ display:"flex", gap:4 }}>{[1,2,3,4,5].map(n=><span key={n} style={{ fontSize:24, cursor:"pointer" }}>☆</span>)}</div>
                  ) : (
                    <input type={f.type==="number"?"number":f.type==="date"?"date":"text"} className="gc-prop-input" style={{ width:"100%" }} placeholder={f.hint ?? ""}/>
                  )}
                </div>
              ))}
              {fields.length > 0 && <button className="gc-btn gc-btn-primary" style={{ width:"100%", justifyContent:"center" }}>Submit</button>}
            </div>
          )}
        </div>

        {/* Properties */}
        <div className="gc-fb-props">
          <div style={{ padding:"10px 12px", borderBottom:"1px solid var(--c-border-light)", display:"flex", alignItems:"center", gap:6 }}>
            <Settings size={13} style={{ color:"var(--c-text-4)" }}/>
            <span style={{ fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:".06em", color:"var(--c-text-4)" }}>Properties</span>
          </div>
          {selF ? (
            <div style={{ padding:12 }}>
              {([["Label",selF.label,(v:string)=>upd(selF.id,{label:v})],["Field Key",selF.key,(v:string)=>upd(selF.id,{key:v})],["Hint",selF.hint??"",(v:string)=>upd(selF.id,{hint:v})]] as [string,string,(v:string)=>void][]).map(([lbl,val,fn]) => (
                <div key={lbl} className="gc-prop-row">
                  <label style={{ fontSize:11, color:"var(--c-text-2)", display:"block", marginBottom:3 }}>{lbl}</label>
                  <input className="gc-prop-input" value={val} onChange={e => fn(e.target.value)}/>
                </div>
              ))}
              <label style={{ display:"flex", alignItems:"center", gap:8, fontSize:12, cursor:"pointer", marginTop:8 }}>
                <input type="checkbox" checked={selF.required??false} onChange={e => upd(selF.id,{required:e.target.checked})} style={{ accentColor:"var(--c-blue)" }}/>
                Required
              </label>
            </div>
          ) : (
            <div style={{ padding:24, textAlign:"center", color:"var(--c-text-4)", fontSize:12 }}>Select a field to edit its properties</div>
          )}
        </div>
      </div>
    </div>
  );
}
