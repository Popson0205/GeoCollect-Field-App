// studio/src/components/GeofenceManager.tsx
"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Plus, Trash2, Check, X } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GeofenceZone {
  id: string;
  name: string;
  polygon: GeoJSON.Polygon;
  assigned_to: string | null;
}

export interface ProjectMember {
  id: string;
  full_name: string;
  email: string;
  role: string;
}

interface Props {
  zones: GeofenceZone[];
  members: ProjectMember[];
  onUpdate: (zones: GeofenceZone[]) => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ZONE_COLORS = [
  "#2563eb", "#16a34a", "#d97706", "#9333ea",
  "#0891b2", "#dc2626", "#0d9488", "#c026d3",
];

const NIGERIA_CENTER: [number, number] = [8.6753, 9.082];

const GOOGLE_HYBRID_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    "google-hybrid": {
      type: "raster",
      tiles: ["https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"],
      tileSize: 256,
      attribution: "© Google",
    },
  },
  layers: [{ id: "google-hybrid", type: "raster", source: "google-hybrid" }],
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function GeofenceManager({ zones, members, onUpdate }: Props) {
  const mapRef          = useRef<HTMLDivElement>(null);
  const mapInstance     = useRef<maplibregl.Map | null>(null);
  const draftMarkersRef = useRef<maplibregl.Marker[]>([]);

  const [drawing, setDrawing]             = useState(false);
  const [draftPoints, setDraftPoints]     = useState<[number, number][]>([]);
  const [draftName, setDraftName]         = useState("");
  const [draftAssignee, setDraftAssignee] = useState("");

  // ── Init map ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current) return;
    const map = new maplibregl.Map({
      container: mapRef.current,
      style: GOOGLE_HYBRID_STYLE,
      center: NIGERIA_CENTER,
      zoom: 6,
    });
    mapInstance.current = map;
    map.addControl(new maplibregl.NavigationControl(), "top-right");
    map.addControl(
      new maplibregl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: false,
      }),
      "top-right"
    );
    map.on("load", () => renderZones(map, zones));
    return () => { map.remove(); mapInstance.current = null; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Re-render on zone change ─────────────────────────────────────────────────
  useEffect(() => {
    const map = mapInstance.current;
    if (!map || !map.isStyleLoaded()) return;
    renderZones(map, zones);
  }, [zones]);

  // ── Draw all committed zones ─────────────────────────────────────────────────
  function renderZones(map: maplibregl.Map, zoneList: GeofenceZone[]) {
    for (let i = 0; i < 30; i++) {
      [`zone-${i}-fill`, `zone-${i}-line`].forEach(id => {
        if (map.getLayer(id)) map.removeLayer(id);
      });
      if (map.getSource(`zone-${i}`)) map.removeSource(`zone-${i}`);
    }
    zoneList.forEach((zone, idx) => {
      const color    = ZONE_COLORS[idx % ZONE_COLORS.length];
      const sourceId = `zone-${idx}`;
      map.addSource(sourceId, {
        type: "geojson",
        data: { type: "Feature", geometry: zone.polygon, properties: {} },
      });
      map.addLayer({
        id: `${sourceId}-fill`, type: "fill", source: sourceId,
        paint: { "fill-color": color, "fill-opacity": 0.12 },
      });
      map.addLayer({
        id: `${sourceId}-line`, type: "line", source: sourceId,
        paint: { "line-color": color, "line-width": 2.5, "line-dasharray": [4, 2] },
      });
    });
    if (zoneList.length > 0) {
      const allCoords = zoneList.flatMap(z => z.polygon.coordinates[0]);
      const lngs = allCoords.map(c => c[0]);
      const lats = allCoords.map(c => c[1]);
      map.fitBounds(
        [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
        { padding: 60, maxZoom: 14, animate: false }
      );
    }
  }

  // ── Map click → place draft point ───────────────────────────────────────────
  const handleMapClick = useCallback((e: maplibregl.MapMouseEvent) => {
    if (!drawing) return;
    const map = mapInstance.current; if (!map) return;
    const { lng, lat } = e.lngLat;
    setDraftPoints(prev => {
      const dot = new maplibregl.Marker({ color: "#f59e0b", scale: 0.6 })
        .setLngLat([lng, lat])
        .addTo(map);
      draftMarkersRef.current.push(dot);
      return [...prev, [lng, lat] as [number, number]];
    });
  }, [drawing]);

  useEffect(() => {
    const map = mapInstance.current; if (!map) return;
    map.on("click", handleMapClick);
    return () => { map.off("click", handleMapClick); };
  }, [handleMapClick]);

  // ── Finish drawing ───────────────────────────────────────────────────────────
  const finishZone = () => {
    if (draftPoints.length < 3) { alert("Place at least 3 points to close a zone."); return; }
    const name   = draftName.trim() || `Zone ${zones.length + 1}`;
    const closed = [...draftPoints, draftPoints[0]] as [number, number][];
    onUpdate([
      ...zones,
      {
        id:          crypto.randomUUID(),
        name,
        polygon:     { type: "Polygon", coordinates: [closed] },
        assigned_to: draftAssignee || null,
      },
    ]);
    cancelDraw();
  };

  // ── Cancel drawing ───────────────────────────────────────────────────────────
  const cancelDraw = () => {
    draftMarkersRef.current.forEach(m => m.remove());
    draftMarkersRef.current = [];
    setDraftPoints([]);
    setDraftName("");
    setDraftAssignee("");
    setDrawing(false);
  };

  // ── Zone helpers ─────────────────────────────────────────────────────────────
  const deleteZone = (id: string) => onUpdate(zones.filter(z => z.id !== id));
  const renameZone = (id: string, name: string) =>
    onUpdate(zones.map(z => z.id === id ? { ...z, name } : z));
  const assignZone = (id: string, userId: string) =>
    onUpdate(zones.map(z => z.id === id ? { ...z, assigned_to: userId || null } : z));
  const getMemberName = (userId: string | null) =>
    userId ? (members.find(m => m.id === userId)?.full_name ?? "Unknown") : null;

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4">

      {/* ── Header row: zone count + ADD ZONE button (always visible) ─────────── */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-700">
            {zones.length === 0
              ? "No zones yet"
              : `${zones.length} zone${zones.length !== 1 ? "s" : ""} defined`}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            Each zone can be assigned to a specific worker. Workers only see their zone.
          </p>
        </div>

        {/* ADD ZONE button — always visible, disabled only while actively drawing */}
        <button
          className="btn btn-primary btn-sm gap-1.5 shrink-0"
          onClick={() => setDrawing(true)}
          disabled={drawing}
          title="Draw a new geofence zone on the map"
        >
          <Plus size={14} />
          Add Zone
        </button>
      </div>

      {/* ── Drawing mode banner ──────────────────────────────────────────────── */}
      {drawing && (
        <div className="flex flex-col gap-2 p-3 rounded-xl border-2 border-amber-300 bg-amber-50">
          <div className="flex items-center gap-2">
            <span className="text-amber-600 font-semibold text-sm">
              ✏️ Drawing zone — click points on the map ({draftPoints.length} placed)
            </span>
            <span className="text-xs text-amber-500 ml-auto">
              {draftPoints.length < 3 ? `${3 - draftPoints.length} more needed` : "ready to finish"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <input
              className="input flex-1 text-sm"
              placeholder={`Zone name (e.g. "Zone ${zones.length + 1}" or "Lagos North")`}
              value={draftName}
              onChange={e => setDraftName(e.target.value)}
              autoFocus
            />
            <select
              className="input text-sm shrink-0"
              style={{ maxWidth: 190 }}
              value={draftAssignee}
              onChange={e => setDraftAssignee(e.target.value)}
            >
              <option value="">Assign to worker…</option>
              {members.map(m => (
                <option key={m.id} value={m.id}>{m.full_name}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <button
              className="btn btn-primary btn-sm flex-1 justify-center gap-1"
              onClick={finishZone}
              disabled={draftPoints.length < 3}
            >
              <Check size={13} /> Finish Zone
            </button>
            <button className="btn btn-secondary btn-sm gap-1" onClick={cancelDraw}>
              <X size={13} /> Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Map ─────────────────────────────────────────────────────────────── */}
      <div
        style={{
          position: "relative",
          height: 360,
          borderRadius: 12,
          overflow: "hidden",
          border: drawing ? "2px solid #fbbf24" : "1px solid #e2e8f0",
          transition: "border-color 0.2s",
        }}
      >
        <div ref={mapRef} style={{ position: "absolute", inset: 0 }} />

        {/* Overlay hint when in drawing mode */}
        {drawing && (
          <div style={{
            position: "absolute", bottom: 12, left: "50%", transform: "translateX(-50%)",
            background: "rgba(0,0,0,0.65)", color: "#fff", borderRadius: 8,
            padding: "5px 14px", fontSize: 11, fontWeight: 600, zIndex: 10,
            whiteSpace: "nowrap", pointerEvents: "none",
          }}>
            Click to place points · {draftPoints.length} placed
          </div>
        )}

        {/* Empty state overlay */}
        {zones.length === 0 && !drawing && (
          <div style={{
            position: "absolute", inset: 0, display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", pointerEvents: "none",
            background: "rgba(248,250,252,0.7)",
          }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: "#64748b" }}>No zones drawn yet</p>
            <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>Click "Add Zone" above to start</p>
          </div>
        )}
      </div>

      {/* ── Zone list ────────────────────────────────────────────────────────── */}
      {zones.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            Zones ({zones.length})
          </p>
          {zones.map((zone, idx) => (
            <div
              key={zone.id}
              className="flex flex-col gap-2 p-3 rounded-xl border border-slate-200 bg-white"
            >
              {/* Zone name row */}
              <div className="flex items-center gap-2">
                <span style={{
                  width: 12, height: 12, borderRadius: "50%",
                  background: ZONE_COLORS[idx % ZONE_COLORS.length],
                  flexShrink: 0, display: "inline-block",
                }} />
                <input
                  className="input flex-1 py-1 text-sm font-medium"
                  value={zone.name}
                  onChange={e => renameZone(zone.id, e.target.value)}
                  placeholder="Zone name"
                />
                <button
                  className="btn btn-ghost btn-xs text-red-400 hover:text-red-600 hover:bg-red-50"
                  onClick={() => deleteZone(zone.id)}
                  title="Delete zone"
                >
                  <Trash2 size={13} />
                </button>
              </div>

              {/* Worker assignment */}
              <div className="flex items-center gap-2 pl-5">
                <span className="text-xs text-slate-400 shrink-0 w-20">Assigned to:</span>
                <select
                  className="input py-1 text-xs flex-1"
                  value={zone.assigned_to || ""}
                  onChange={e => assignZone(zone.id, e.target.value)}
                >
                  <option value="">Open — any worker can submit</option>
                  {members.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.full_name} ({m.email})
                    </option>
                  ))}
                </select>
              </div>

              {/* Assignment badge */}
              <div className="pl-5">
                {zone.assigned_to ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-full px-2.5 py-1">
                    👷 {getMemberName(zone.assigned_to)}
                  </span>
                ) : (
                  <span className="text-xs text-slate-400">Open zone — all workers can submit here</span>
                )}
              </div>
            </div>
          ))}

          {/* Repeat add button below list for convenience */}
          <button
            className="btn btn-secondary w-full justify-center gap-1.5 mt-1"
            onClick={() => setDrawing(true)}
            disabled={drawing}
          >
            <Plus size={14} /> Add Another Zone
          </button>
        </div>
      )}
    </div>
  );
}
