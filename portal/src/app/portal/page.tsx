"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import TopNav from "@/components/TopNav";
import { ArrowRight, Plus, Map, FileText, Upload, BarChart2, Clock, Activity } from "lucide-react";

const ICON_BG: Record<string, string> = {
  layer: "#fff3e0", form: "#e8f5e9", map: "#e3f2fd", dash: "#f3e5f5", view: "#fce4ec", scene: "#ede7f6",
};
const ICON_EMOJI: Record<string, string> = {
  layer: "🗂️", form: "📋", map: "🗺️", dash: "📊", view: "🗂️", scene: "🏔️",
};

const RECENT = [
  { id:"fl1", name:"Niger Delta Asset Survey",                          type:"layer", sub:"Feature layer (hosted)",        time:"2 hours ago" },
  { id:"fl2", name:"Niger Delta Asset Survey_view",                     type:"view",  sub:"Feature layer (hosted, view)",   time:"2 hours ago" },
  { id:"f1",  name:"Niger Delta Asset Survey Form",                     type:"form",  sub:"Survey form · 48 responses",     time:"1 day ago" },
  { id:"m1",  name:"Niger Delta Power Holding Asset Map",               type:"map",   sub:"Web map",                        time:"1 day ago" },
  { id:"d1",  name:"Niger Delta Power Holding Company Asset Dashboard", type:"dash",  sub:"Dashboard",                      time:"2 days ago" },
  { id:"fl3", name:"NCFRMI Field Survey Layer",                         type:"layer", sub:"Feature layer (hosted)",         time:"3 days ago" },
  { id:"m2",  name:"GIS Day 2025 Demo Map",                             type:"map",   sub:"Web map",                        time:"5 days ago" },
];

const MAPS = [
  { id:"m1", name:"Niger Delta Power Holding Asset Map", time:"1 day ago" },
  { id:"m2", name:"GIS Day 2025 Demo Map",               time:"5 days ago" },
];

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export default function PortalHome() {
  const [user, setUser] = useState<{ full_name: string; role: string } | null>(null);

  useEffect(() => {
    const u = localStorage.getItem("gc_user");
    if (u) setUser(JSON.parse(u));
  }, []);

  const firstName = user?.full_name?.split(" ")[0] ?? "Faridat";

  return (
    <div className="gc-page">
      <TopNav user={user ?? undefined} />

      {/* Hero */}
      <div className="gc-hero">
        <p className="gc-hero-org">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="rgba(255,255,255,0.7)"><circle cx="12" cy="12" r="10"/></svg>
          Popson Geospatial Service
        </p>
        <h1 className="gc-hero-title">{greeting()}, <b>{firstName}</b> 👋</h1>
        <p className="gc-hero-sub">
          Your open-architecture geospatial data collection platform. Collect, manage,
          analyze, and share spatial data — without the ArcGIS ceiling.
        </p>
        <div className="gc-hero-actions">
          <Link href="/forms/new" className="gc-btn gc-btn-hero-primary"><Plus size={13}/> New Form</Link>
          <Link href="/content"   className="gc-btn gc-btn-hero-outline">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 9h6M9 12h6M9 15h4"/></svg>
            Browse Content
          </Link>
          <Link href="/map" className="gc-btn gc-btn-hero-outline"><Map size={13}/> Open Map Viewer</Link>
        </div>
      </div>

      {/* Stat cards */}
      <div className="gc-stats">
        {[
          { label:"Feature Layers", num:3,  bg:"#fff3e0", emoji:"🗂️", href:"/content?type=layer" },
          { label:"Forms",          num:2,  bg:"#e8f5e9", emoji:"📋", href:"/forms" },
          { label:"Maps",           num:2,  bg:"#e3f2fd", emoji:"🗺️", href:"/content?type=map" },
          { label:"Dashboards",     num:1,  bg:"#f3e5f5", emoji:"📊", href:"/dashboards" },
        ].map(({ label, num, bg, emoji, href }) => (
          <Link key={label} href={href} className="gc-stat">
            <div className="gc-stat-icon" style={{ background: bg }}>{emoji}</div>
            <div>
              <div className="gc-stat-num">{num}</div>
              <div className="gc-stat-label">{label}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* Two-col body */}
      <div className="gc-home-body">
        {/* Recent Content */}
        <div>
          <div className="gc-section-hdr">
            <span className="gc-section-title"><Clock size={13}/> Recent Content</span>
            <Link href="/content" className="gc-view-all">View all <ArrowRight size={12}/></Link>
          </div>
          <div className="gc-list">
            {RECENT.map(item => (
              <Link key={item.id} href={`/content/${item.id}`} className="gc-list-row">
                <div className="gc-item-icon" style={{ background: ICON_BG[item.type] }}>{ICON_EMOJI[item.type]}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="gc-item-name gc-truncate">{item.name}</div>
                  <div className="gc-item-sub">{item.sub}</div>
                </div>
                <div className="gc-item-time">{item.time}</div>
              </Link>
            ))}
          </div>
        </div>

        {/* Right panel */}
        <div>
          <div className="gc-section-hdr"><span className="gc-section-title"><Activity size={13}/> Quick Actions</span></div>
          <div className="gc-qa-card">
            {[
              { href:"/forms/new",     icon:<FileText size={15} color="#2e7d32"/>, bg:"#e8f5e9", label:"Create a Form",   desc:"Design a data collection survey" },
              { href:"/map",           icon:<Map      size={15} color="#0079c1"/>, bg:"#e3f2fd", label:"Open Map Viewer", desc:"View and create spatial maps" },
              { href:"/content",       icon:<Upload   size={15} color="#e65100"/>, bg:"#fff3e0", label:"Browse Content",  desc:"Manage layers, maps & dashboards" },
              { href:"/dashboards",    icon:<BarChart2 size={15} color="#6a1b9a"/>,bg:"#f3e5f5", label:"Build Dashboard", desc:"Create interactive data dashboards" },
            ].map(({ href, icon, bg, label, desc }) => (
              <Link key={label} href={href} className="gc-qa-row">
                <div className="gc-qa-icon" style={{ background: bg }}>{icon}</div>
                <div>
                  <div className="gc-qa-label">{label}</div>
                  <div className="gc-qa-desc">{desc}</div>
                </div>
              </Link>
            ))}
          </div>

          <div className="gc-section-hdr" style={{ marginTop: 16 }}>
            <span className="gc-section-title"><Map size={13}/> Featured Maps</span>
          </div>
          <div className="gc-featured">
            {MAPS.map(m => (
              <Link key={m.id} href={`/map?id=${m.id}`} className="gc-featured-row">
                <div className="gc-featured-thumb"><Map size={15} color="#0079c1"/></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="gc-featured-name gc-truncate">{m.name}</div>
                  <div className="gc-featured-time">{m.time}</div>
                </div>
                <ArrowRight size={12} style={{ color: "var(--c-text-4)", flexShrink: 0 }}/>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
