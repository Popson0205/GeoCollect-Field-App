// field/src/pages/PublicCollectPage.tsx
// Public data collection page — no authentication required.
// Accessed via share link: https://field.app/s/:token
//
// Behaviour by visibility:
//   public       → full access, anonymous submission allowed
//   organization → shows "log in" prompt (redirects to /auth)
//   private      → shows "access denied" screen
//   not found    → 404 screen

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { v4 as uuid } from "uuid";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SelectOption { label: string; value: string; }

interface FieldDef {
  id: string; key: string; label: string; type: string;
  required?: boolean; hint?: string; options?: SelectOption[];
}

interface GeofenceZone {
  id: string;
  name: string;
  polygon: { type: "Polygon"; coordinates: [number, number][][] };
}

interface PublicForm {
  id: string;
  project_id: string;
  name: string;
  geometry_type: string;
  schema: { fields: FieldDef[] };
  geofences: GeofenceZone[];
  visibility: "public" | "organization" | "private";
}

interface NominatimResult {
  place_id: number; display_name: string; lat: string; lon: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const API = import.meta.env.VITE_API_URL || "";

const DEVICE_ID = (() => {
  let id = localStorage.getItem("gc_device_id");
  if (!id) { id = uuid(); localStorage.setItem("gc_device_id", id); }
  return id;
})();

const GOOGLE_HYBRID_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    "google-hybrid": {
      type: "raster",
      tiles: ["https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"],
      tileSize: 256, attribution: "© Google",
    },
  },
  layers: [{ id: "google-hybrid", type: "raster", source: "google-hybrid" }],
};

const NIGERIA_CENTER: [number, number] = [8.6753, 9.082];
const NIGERIA_ZOOM = 6;

// Zone colours — cycles for up to 8 zones
const ZONE_COLORS = [
  "#2563eb", "#16a34a", "#d97706", "#9333ea",
  "#0891b2", "#dc2626", "#0d9488", "#c026d3",
];

// ─── Point-in-polygon (ray casting) ──────────────────────────────────────────

function pointInPolygon(
  point: [number, number],
  polygon: { coordinates: [number, number][][] }
): boolean {
  const [px, py] = point;
  const ring = polygon.coordinates[0];
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]; const [xj, yj] = ring[j];
    const intersect = yi > py !== yj > py &&
      px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function pointInAnyZone(point: [number, number], zones: GeofenceZone[]): boolean {
  return zones.some((z) => pointInPolygon(point, z.polygon));
}

// ─── Address Search ───────────────────────────────────────────────────────────

function AddressSearch({ onSelect }: { onSelect: (lng: number, lat: number) => void }) {
  const [query, setQuery]     = useState("");
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen]       = useState(false);
  const debounce              = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback((q: string) => {
    if (debounce.current) clearTimeout(debounce.current);
    if (!q.trim()) { setResults([]); setOpen(false); return; }
    debounce.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res  = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&countrycodes=ng&limit=5`,
          { headers: { "Accept-Language": "en" } }
        );
        const data = (await res.json()) as NominatimResult[];
        setResults(data); setOpen(data.length > 0);
      } catch { setResults([]); }
      finally { setLoading(false); }
    }, 400);
  }, []);

  return (
    <div style={{ position: "relative", zIndex: 20 }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 8, background: "#fff",
        borderRadius: 10, border: "1px solid #e2e8f0",
        boxShadow: "0 2px 12px rgba(0,0,0,0.14)", padding: "8px 12px",
      }}>
        <span style={{ fontSize: 14, color: "#94a3b8", flexShrink: 0 }}>🔍</span>
        <input
          style={{ flex: 1, border: "none", outline: "none", fontSize: 13, color: "#0f172a", background: "transparent", minWidth: 0 }}
          placeholder="Search address or place…"
          value={query}
          onChange={e => { setQuery(e.target.value); search(e.target.value); }}
          onFocus={() => results.length > 0 && setOpen(true)}
        />
        {loading && <span style={{ fontSize: 11, color: "#94a3b8" }}>…</span>}
        {query && !loading && (
          <button style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", padding: 0 }}
            onClick={() => { setQuery(""); setResults([]); setOpen(false); }}>✕</button>
        )}
      </div>
      {open && results.length > 0 && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
          background: "#fff", borderRadius: 10, border: "1px solid #e2e8f0",
          boxShadow: "0 8px 24px rgba(0,0,0,0.14)", overflow: "hidden",
        }}>
          {results.map(r => (
            <button key={r.place_id}
              style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 14px", border: "none", background: "none", cursor: "pointer", fontSize: 12, color: "#0f172a", borderBottom: "1px solid #f1f5f9" }}
              onMouseEnter={e => (e.currentTarget.style.background = "#f8fafc")}
              onMouseLeave={e => (e.currentTarget.style.background = "none")}
              onClick={() => { onSelect(parseFloat(r.lon), parseFloat(r.lat)); setQuery(r.display_name.split(",")[0]); setOpen(false); }}
            >
              <strong>{r.display_name.split(",")[0]}</strong><br />
              <span style={{ color: "#94a3b8", fontSize: 11 }}>{r.display_name.split(",").slice(1, 3).join(",")}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Field Input (same as CollectPage) ────────────────────────────────────────

function FieldInput({ field, value, onChange }: {
  field: FieldDef; value: unknown; onChange: (v: unknown) => void;
}) {
  const base: React.CSSProperties = {
    width: "100%", padding: "10px 12px", borderRadius: 10,
    border: "1px solid #e2e8f0", fontSize: 14, background: "#fff", outline: "none",
  };
  switch (field.type) {
    case "text":
      return <input style={base} type="text" placeholder={field.hint || ""} value={(value as string) || ""} onChange={e => onChange(e.target.value)} />;
    case "number":
      return <input style={base} type="number" placeholder={field.hint || ""} value={(value as string) || ""} onChange={e => onChange(parseFloat(e.target.value))} />;
    case "date":
      return <input style={base} type="date" value={(value as string) || ""} onChange={e => onChange(e.target.value)} />;
    case "datetime":
      return <input style={base} type="datetime-local" value={(value as string) || ""} onChange={e => onChange(e.target.value)} />;
    case "boolean":
      return (
        <div style={{ display: "flex", gap: 12 }}>
          {["Yes", "No"].map(opt => (
            <label key={opt} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "8px", borderRadius: 8, cursor: "pointer", fontSize: 14, border: `2px solid ${value === opt ? "#2563eb" : "#e2e8f0"}`, background: value === opt ? "#eff6ff" : "#fff", color: value === opt ? "#2563eb" : "#64748b", fontWeight: value === opt ? 600 : 400 }}>
              <input type="radio" name={field.key} value={opt} checked={value === opt} onChange={() => onChange(opt)} style={{ display: "none" }} />
              {opt === "Yes" ? "✓ Yes" : "✗ No"}
            </label>
          ))}
        </div>
      );
    case "select":
      return (
        <select style={{ ...base, appearance: "none" }} value={(value as string) || ""} onChange={e => onChange(e.target.value)}>
          <option value="">Select an option…</option>
          {(field.options || []).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      );
    case "photo":
      return (
        <div>
          <label style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px 16px", borderRadius: 10, border: "2px dashed #cbd5e1", background: "#f8fafc", cursor: "pointer", fontSize: 14, color: "#64748b" }}>
            📷 {value ? "Change photo" : "Take / upload photo"}
            <input type="file" accept="image/*" capture="environment" style={{ display: "none" }}
              onChange={async e => { const file = e.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => onChange(reader.result); reader.readAsDataURL(file); }} />
          </label>
          {value && <img src={value as string} alt="captured" style={{ width: "100%", borderRadius: 10, marginTop: 8, maxHeight: 240, objectFit: "cover" }} />}
        </div>
      );
    default:
      return <input style={base} type="text" value={(value as string) || ""} onChange={e => onChange(e.target.value)} />;
  }
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type LoadState = "loading" | "ready" | "private" | "org" | "notfound" | "error";

export default function PublicCollectPage() {
  const { token } = useParams<{ token: string }>();
  const nav = useNavigate();

  const mapRef      = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<maplibregl.Map | null>(null);
  const markerRef   = useRef<maplibregl.Marker | null>(null);

  const [loadState, setLoadState]       = useState<LoadState>("loading");
  const [form, setForm]                 = useState<PublicForm | null>(null);
  const [geometry, setGeometry]         = useState<GeoJSON.Geometry | null>(null);
  const [attrs, setAttrs]               = useState<Record<string, unknown>>({});
  const [step, setStep]                 = useState<"map" | "form">("map");
  const [submitting, setSubmitting]     = useState(false);
  const [done, setDone]                 = useState(false);
  const [insideGeofence, setInsideGeofence] = useState<boolean | null>(null);

  // ── Load form via share token ────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API}/forms/share/${token}`);
        if (res.status === 404) { setLoadState("notfound"); return; }
        if (res.status === 403) {
          const body = await res.json();
          setLoadState(body.error?.includes("organization") ? "org" : "private");
          return;
        }
        if (!res.ok) { setLoadState("error"); return; }
        const data = (await res.json()) as PublicForm;
        setForm(data);
        setLoadState("ready");
      } catch {
        setLoadState("error");
      }
    })();
  }, [token]);

  // ── Init map ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (loadState !== "ready" || step !== "map" || !mapRef.current || !form) return;

    const map = new maplibregl.Map({
      container: mapRef.current,
      style: GOOGLE_HYBRID_STYLE,
      center: NIGERIA_CENTER,
      zoom: NIGERIA_ZOOM,
    });
    mapInstance.current = map;

    map.addControl(new maplibregl.NavigationControl(), "top-right");
    map.addControl(
      new maplibregl.GeolocateControl({ positionOptions: { enableHighAccuracy: true }, trackUserLocation: true, showUserLocation: true }),
      "top-right"
    );

    map.on("load", () => {
      const zones = form.geofences || [];
      if (zones.length === 0) return;

      // Draw each zone with its own colour
      zones.forEach((zone, idx) => {
        const color = ZONE_COLORS[idx % ZONE_COLORS.length];
        const sourceId = `geofence-${zone.id}`;

        map.addSource(sourceId, {
          type: "geojson",
          data: { type: "Feature", geometry: zone.polygon, properties: {} },
        });
        map.addLayer({ id: `${sourceId}-fill`, type: "fill", source: sourceId, paint: { "fill-color": color, "fill-opacity": 0.1 } });
        map.addLayer({ id: `${sourceId}-line`, type: "line", source: sourceId, paint: { "line-color": color, "line-width": 2.5, "line-dasharray": [4, 2] } });
      });

      // Fit bounds to union of all zones
      const allCoords = zones.flatMap((z) => z.polygon.coordinates[0]);
      const lngs = allCoords.map((c) => c[0]);
      const lats = allCoords.map((c) => c[1]);
      map.fitBounds(
        [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
        { padding: 60, maxZoom: 14 }
      );
    });

    map.on("click", (e) => placeMarkerAt(map, e.lngLat.lng, e.lngLat.lat, form));

    return () => { map.remove(); mapInstance.current = null; };
  }, [loadState, step, form]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Place marker + geofence check ────────────────────────────────────────────
  const placeMarkerAt = useCallback(
    (map: maplibregl.Map, lng: number, lat: number, currentForm: PublicForm | null) => {
      if (markerRef.current) markerRef.current.remove();
      const marker = new maplibregl.Marker({ color: "#2563eb" }).setLngLat([lng, lat]).addTo(map);
      markerRef.current = marker;
      setGeometry({ type: "Point", coordinates: [lng, lat] });

      const zones = currentForm?.geofences || [];
      if (zones.length > 0) {
        setInsideGeofence(pointInAnyZone([lng, lat], zones));
      } else {
        setInsideGeofence(true);
      }
    }, []
  );

  const handleSearchSelect = useCallback((lng: number, lat: number) => {
    const map = mapInstance.current; if (!map) return;
    map.flyTo({ center: [lng, lat], zoom: 14, speed: 1.4 });
    setTimeout(() => placeMarkerAt(map, lng, lat, form), 600);
  }, [form, placeMarkerAt]);

  // ── Submit ───────────────────────────────────────────────────────────────────
  const submit = async () => {
    if (!geometry || insideGeofence === false || !form) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/features/public`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          share_token: token,
          form_schema_id: form.id,
          project_id: form.project_id,
          geometry,
          attributes: attrs,
          device_id: DEVICE_ID,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Submission failed. Please try again.");
        return;
      }
      setDone(true);
    } finally {
      setSubmitting(false);
    }
  };

  // ── State screens ─────────────────────────────────────────────────────────────

  if (loadState === "loading") {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12, background: "#f8fafc" }}>
        <div style={{ width: 40, height: 40, border: "4px solid #e2e8f0", borderTopColor: "#2563eb", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <p style={{ fontSize: 14, color: "#64748b" }}>Loading form…</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (loadState === "notfound" || loadState === "error") {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12, padding: 24, background: "#f8fafc" }}>
        <div style={{ fontSize: 48 }}>🔍</div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: "#0f172a" }}>Form not found</h2>
        <p style={{ color: "#64748b", textAlign: "center", fontSize: 14 }}>This link may be invalid or the form has been unpublished.</p>
      </div>
    );
  }

  if (loadState === "private") {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12, padding: 24, background: "#f8fafc" }}>
        <div style={{ fontSize: 48 }}>🔒</div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: "#0f172a" }}>Private form</h2>
        <p style={{ color: "#64748b", textAlign: "center", fontSize: 14 }}>This form is private and cannot be accessed via share link.</p>
      </div>
    );
  }

  if (loadState === "org") {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12, padding: 24, background: "#f8fafc" }}>
        <div style={{ fontSize: 48 }}>🏢</div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: "#0f172a" }}>Organization only</h2>
        <p style={{ color: "#64748b", textAlign: "center", fontSize: 14 }}>This form is restricted to organization members. Please log in to continue.</p>
        <button className="btn btn-primary" style={{ justifyContent: "center", padding: "12px 24px", marginTop: 8 }}
          onClick={() => nav(`/auth?redirect=/s/${token}`)}>
          Log in
        </button>
      </div>
    );
  }

  if (done) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16, padding: 24, background: "#f8fafc" }}>
        <div style={{ width: 72, height: 72, borderRadius: "50%", background: "#dcfce7", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36 }}>✅</div>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: "#0f172a" }}>Thank you!</h2>
        <p style={{ color: "#64748b", textAlign: "center", fontSize: 14 }}>Your response has been submitted successfully.</p>
        <button className="btn btn-primary" style={{ justifyContent: "center", padding: "12px 24px" }}
          onClick={() => { setDone(false); setGeometry(null); setAttrs({}); setStep("map"); setInsideGeofence(null); }}>
          Submit Another
        </button>
      </div>
    );
  }

  const fields      = form?.schema?.fields || [];
  const hasZones    = (form?.geofences || []).length > 0;
  const isBlocked   = insideGeofence === false;
  const canProceed  = !!geometry && !isBlocked;
  const requiredMissing = fields.filter(f => f.required).some(f => {
    const v = attrs[f.key];
    if (Array.isArray(v)) return v.length === 0;
    return v === undefined || v === null || v === "";
  });

  return (
    <div style={{ height: "100dvh", display: "flex", flexDirection: "column", background: "#f8fafc" }}>

      {/* Header */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e2e8f0", padding: "10px 16px", display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
        {step === "form" && (
          <button className="btn btn-ghost" style={{ padding: "6px 10px", borderRadius: 8 }} onClick={() => setStep("map")}>←</button>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontWeight: 700, fontSize: 15, color: "#0f172a" }}>{form?.name}</p>
          <p style={{ fontSize: 11, color: "#64748b", marginTop: 1 }}>
            {step === "map"
              ? hasZones ? "Tap inside a boundary to place your location" : "Tap the map to place your location"
              : `Fill in ${fields.length} field${fields.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {["map", "form"].map(s => (
            <span key={s} style={{ width: step === s ? 20 : 8, height: 8, borderRadius: 99, background: step === s ? "#2563eb" : "#e2e8f0", transition: "all 0.2s" }} />
          ))}
        </div>
      </div>

      {/* Map step */}
      {step === "map" && (
        <>
          <div style={{ position: "relative", flex: 1 }}>
            <div ref={mapRef} style={{ position: "absolute", inset: 0 }} />
            <div style={{ position: "absolute", top: 12, left: 12, width: "min(320px, calc(100% - 64px))", zIndex: 10 }}>
              <AddressSearch onSelect={handleSearchSelect} />
            </div>
            {isBlocked && (
              <div style={{ position: "absolute", bottom: 16, left: "50%", transform: "translateX(-50%)", background: "#fef2f2", color: "#dc2626", border: "2px solid #fecaca", padding: "10px 20px", borderRadius: 12, fontSize: 13, fontWeight: 700, boxShadow: "0 4px 16px rgba(220,38,38,0.2)", display: "flex", alignItems: "center", gap: 8, zIndex: 10, whiteSpace: "nowrap" }}>
                🚫 Outside all zones — tap inside a boundary
              </div>
            )}
          </div>
          <div style={{ background: "#fff", borderTop: "1px solid #e2e8f0", padding: "14px 16px", flexShrink: 0 }}>
            {geometry ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <div>
                  <p style={{ fontSize: 12, fontWeight: 600, color: isBlocked ? "#dc2626" : "#16a34a" }}>
                    {isBlocked ? "🚫" : "📍"}{" "}
                    {(geometry as GeoJSON.Point).coordinates[1].toFixed(5)},{" "}
                    {(geometry as GeoJSON.Point).coordinates[0].toFixed(5)}
                  </p>
                  <p style={{ fontSize: 11, color: isBlocked ? "#dc2626" : "#94a3b8", marginTop: 2 }}>
                    {isBlocked ? "Move your pin inside a boundary to continue" : "Tap to reposition"}
                  </p>
                </div>
                <button className="btn btn-primary" style={{ flexShrink: 0, opacity: canProceed ? 1 : 0.35, cursor: canProceed ? "pointer" : "not-allowed", pointerEvents: canProceed ? "auto" : "none" }}
                  disabled={!canProceed} onClick={() => setStep("form")}>
                  Next →
                </button>
              </div>
            ) : (
              <p style={{ fontSize: 13, color: "#94a3b8", textAlign: "center", padding: "4px 0" }}>
                {hasZones ? "Search an address or tap inside a boundary" : "Search an address or tap the map"}
              </p>
            )}
          </div>
        </>
      )}

      {/* Form step */}
      {step === "form" && (
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px 100px", display: "flex", flexDirection: "column", gap: 18 }}>
          {fields.map(field => (
            <div key={field.id}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {field.label}
                {field.required && <span style={{ color: "#dc2626", marginLeft: 3 }}>*</span>}
              </label>
              <FieldInput field={field} value={attrs[field.key]} onChange={v => setAttrs(a => ({ ...a, [field.key]: v }))} />
              {field.hint && <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 5, lineHeight: 1.4 }}>{field.hint}</p>}
            </div>
          ))}
          <button className="btn btn-primary"
            style={{ justifyContent: "center", padding: "14px 16px", marginTop: 8, fontSize: 15, fontWeight: 700, borderRadius: 12, opacity: (submitting || requiredMissing) ? 0.5 : 1, cursor: (submitting || requiredMissing) ? "not-allowed" : "pointer" }}
            onClick={submit} disabled={submitting || requiredMissing}>
            {submitting ? "Submitting…" : "✓ Submit"}
          </button>
          {requiredMissing && <p style={{ fontSize: 12, color: "#dc2626", textAlign: "center", marginTop: -8 }}>Please fill in all required fields</p>}
        </div>
      )}
    </div>
  );
}
