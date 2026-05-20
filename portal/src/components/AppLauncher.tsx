"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";

export interface AppEntry {
  id: string;
  label: string;
  href: string;
  external?: boolean;
  color: string;
  icon: React.ReactNode;
}

export const APP_REGISTRY: AppEntry[] = [
  {
    id: "portal", label: "GeoCollect", href: "/portal", color: "#1a6faf",
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={22} height={22}><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
  },
  {
    id: "studio", label: "Studio", href: "https://geocollect-studio.onrender.com", external: true, color: "#1e3a5f",
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={22} height={22}><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 9h6M9 12h6M9 15h4"/><circle cx="17" cy="17" r="3"/><path d="M19.5 19.5L22 22"/></svg>,
  },
  {
    id: "map", label: "Map Viewer", href: "/map", color: "#2d7d46",
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={22} height={22}><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>,
  },
  {
    id: "scene", label: "Scene Viewer", href: "/scene", color: "#6b3fa0",
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={22} height={22}><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>,
  },
  {
    id: "dashboards", label: "Dashboards", href: "/dashboards", color: "#c47d17",
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={22} height={22}><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
  },
  {
    id: "forms", label: "Field Survey", href: "/forms", color: "#b5341c",
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={22} height={22}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="15" y2="17"/></svg>,
  },
  {
    id: "content", label: "Content", href: "/content", color: "#2a6496",
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={22} height={22}><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>,
  },
  {
    id: "field", label: "Field App", href: "https://geocollect-field.onrender.com", external: true, color: "#5c4033",
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={22} height={22}><path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z"/><circle cx="12" cy="10" r="3"/></svg>,
  },
  {
    id: "organization", label: "Organization", href: "/organization", color: "#3d6b35",
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={22} height={22}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  },
];

export default function AppLauncher() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      {/* Trigger */}
      <button
        onClick={() => setOpen(v => !v)}
        aria-label="App launcher"
        aria-expanded={open}
        className="gc-nav-icon"
        style={{ background: open ? "rgba(255,255,255,0.18)" : undefined }}
      >
        <svg viewBox="0 0 24 24" width={18} height={18} fill="currentColor">
          <circle cx="5"  cy="5"  r="1.8"/><circle cx="12" cy="5"  r="1.8"/><circle cx="19" cy="5"  r="1.8"/>
          <circle cx="5"  cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/>
          <circle cx="5"  cy="19" r="1.8"/><circle cx="12" cy="19" r="1.8"/><circle cx="19" cy="19" r="1.8"/>
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="gc-launcher-panel" role="dialog" aria-label="App launcher">
          <p className="gc-launcher-label">Applications</p>
          <div className="gc-launcher-grid">
            {APP_REGISTRY.map(app =>
              app.external ? (
                /* External links use a plain <a> — no Next.js Link typing issues */
                <a
                  key={app.id}
                  href={app.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="gc-launcher-item"
                  onClick={() => setOpen(false)}
                >
                  <div className="gc-launcher-icon" style={{ background: app.color }}>
                    {app.icon}
                  </div>
                  <span className="gc-launcher-name">{app.label}</span>
                </a>
              ) : (
                /* Internal links use Next.js Link — href is always a string */
                <Link
                  key={app.id}
                  href={app.href}
                  className="gc-launcher-item"
                  onClick={() => setOpen(false)}
                >
                  <div className="gc-launcher-icon" style={{ background: app.color }}>
                    {app.icon}
                  </div>
                  <span className="gc-launcher-name">{app.label}</span>
                </Link>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}
