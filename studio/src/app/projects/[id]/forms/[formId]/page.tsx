// studio/src/app/projects/[id]/forms/[formId]/page.tsx
"use client";

import {
  useEffect,
  useState,
  useCallback,
  useRef,
  type DragEvent,
} from "react";
import type { Map as MaplibreMap } from "maplibre-gl";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Type,
  Hash,
  ChevronDown,
  Calendar,
  Clock,
  Camera,
  Mic,
  ToggleLeft,
  Star,
  Sigma,
  List,
  GripVertical,
  Trash2,
  Plus,
  X,
  ChevronLeft,
  Save,
  Send,
  MapPin,
  Settings2,
  Layers,
  AlertTriangle,
  CheckCircle2,
  Search,
} from "lucide-react";
import { api } from "@/lib/api";
import type { FormSchema, FieldDef, GeometryType } from "@/types";

// ─── Constants ────────────────────────────────────────────────────────────────

const FIELD_TYPES: {
  type: FieldDef["type"];
  label: string;
  icon: React.ElementType;
  color: string;
}[] = [
  { type: "text",       label: "Text",       icon: Type,        color: "text-blue-500" },
  { type: "number",     label: "Number",     icon: Hash,        color: "text-violet-500" },
  { type: "select",     label: "Select",     icon: ChevronDown, color: "text-emerald-500" },
  { type: "multiselect",label: "Multi-select",icon: List,       color: "text-teal-500" },
  { type: "date",       label: "Date",       icon: Calendar,    color: "text-orange-500" },
  { type: "datetime",   label: "Date & Time",icon: Clock,       color: "text-amber-500" },
  { type: "photo",      label: "Photo",      icon: Camera,      color: "text-pink-500" },
  { type: "audio",      label: "Audio",      icon: Mic,         color: "text-red-500" },
  { type: "boolean",    label: "Yes / No",   icon: ToggleLeft,  color: "text-cyan-500" },
  { type: "rating",     label: "Rating",     icon: Star,        color: "text-yellow-500" },
  { type: "calculated", label: "Calculated", icon: Sigma,       color: "text-slate-500" },
];

const GEOMETRY_TYPES: GeometryType[] = ["Point", "LineString", "Polygon", "Multi"];

const DEFAULT_OPTIONS = [
  { value: "option_1", label: "Option 1" },
  { value: "option_2", label: "Option 2" },
  { value: "option_3", label: "Option 3" },
];

// ─── Select Options Editor ────────────────────────────────────────────────────

function OptionsEditor({
  options,
  onChange,
}: {
  options: { value: string; label: string }[];
  onChange: (opts: { value: string; label: string }[]) => void;
}) {
  const addOption = () => {
    const idx = options.length + 1;
    onChange([
      ...options,
      { value: `option_${idx}`, label: `Option ${idx}` },
    ]);
  };

  const updateLabel = (i: number, label: string) => {
    const updated = options.map((o, j) =>
      j === i
        ? { ...o, label, value: label.toLowerCase().replace(/\s+/g, "_") || o.value }
        : o
    );
    onChange(updated);
  };

  const removeOption = (i: number) => {
    onChange(options.filter((_, j) => j !== i));
  };

  return (
    <div className="col-span-2 space-y-2">
      <label className="label">Options</label>
      <div className="space-y-1.5">
        {options.map((opt, i) => (
          <div key={i} className="option-row group">
            <span className="text-slate-300 shrink-0">
              <GripVertical size={14} />
            </span>
            <input
              className="flex-1 bg-transparent text-sm text-slate-700 outline-none min-w-0
                         placeholder:text-slate-400"
              value={opt.label}
              placeholder={`Option ${i + 1}`}
              onChange={(e) => updateLabel(i, e.target.value)}
            />
            <span className="text-[10px] text-slate-400 font-mono shrink-0 hidden group-hover:inline">
              {opt.value}
            </span>
            <button
              type="button"
              onClick={() => removeOption(i)}
              className="shrink-0 text-slate-300 hover:text-red-500 transition-colors"
              title="Remove option"
            >
              <X size={13} />
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={addOption}
        className="flex items-center gap-1.5 text-xs text-primary hover:text-primary-dark
                   font-medium mt-1 px-1"
      >
        <Plus size={13} />
        Add option
      </button>
    </div>
  );
}

// ─── Field Editor Card ────────────────────────────────────────────────────────

function FieldCard({
  field,
  index,
  total,
  onChange,
  onRemove,
  onDragStart,
  onDragOver,
  onDrop,
}: {
  field: FieldDef;
  index: number;
  total: number;
  onChange: (f: FieldDef) => void;
  onRemove: () => void;
  onDragStart: (i: number) => void;
  onDragOver: (e: DragEvent, i: number) => void;
  onDrop: (i: number) => void;
}) {
  const meta = FIELD_TYPES.find((t) => t.type === field.type);
  const Icon = meta?.icon ?? Type;
  const hasOptions = field.type === "select" || field.type === "multiselect";

  return (
    <div
      className="field-card"
      draggable
      onDragStart={() => onDragStart(index)}
      onDragOver={(e) => { e.preventDefault(); onDragOver(e, index); }}
      onDrop={() => onDrop(index)}
    >
      {/* Card header */}
      <div className="flex items-center gap-2 mb-3">
        <span className="cursor-grab text-slate-300 hover:text-slate-400 active:cursor-grabbing">
          <GripVertical size={16} />
        </span>
        <span className={`${meta?.color ?? "text-slate-400"}`}>
          <Icon size={15} />
        </span>
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
          {meta?.label ?? field.type}
        </span>
        <span className="ml-auto text-xs text-slate-300">#{index + 1}</span>
        <button
          onClick={onRemove}
          className="text-slate-300 hover:text-red-500 transition-colors"
          title="Remove field"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* Fields */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Label</label>
          <input
            className="input"
            value={field.label}
            onChange={(e) => onChange({ ...field, label: e.target.value })}
          />
        </div>
        <div>
          <label className="label">Field Key</label>
          <input
            className="input font-mono text-xs"
            value={field.key}
            onChange={(e) =>
              onChange({
                ...field,
                key: e.target.value.toLowerCase().replace(/\s+/g, "_"),
              })
            }
          />
        </div>
        <div>
          <label className="label">Type</label>
          <select
            className="input"
            value={field.type}
            onChange={(e) =>
              onChange({
                ...field,
                type: e.target.value as FieldDef["type"],
                // Seed options when switching to select/multiselect
                options:
                  (e.target.value === "select" ||
                    e.target.value === "multiselect") &&
                  !field.options?.length
                    ? [...DEFAULT_OPTIONS]
                    : field.options,
              })
            }
          >
            {FIELD_TYPES.map((t) => (
              <option key={t.type} value={t.type}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Hint</label>
          <input
            className="input"
            placeholder="Helper text for the collector"
            value={field.hint || ""}
            onChange={(e) => onChange({ ...field, hint: e.target.value })}
          />
        </div>

        {/* Options editor for select/multiselect */}
        {hasOptions && (
          <OptionsEditor
            options={field.options?.length ? field.options : [...DEFAULT_OPTIONS]}
            onChange={(opts) => onChange({ ...field, options: opts })}
          />
        )}

        {/* Calculated formula */}
        {field.type === "calculated" && (
          <div className="col-span-2">
            <label className="label">Formula</label>
            <input
              className="input font-mono text-xs"
              placeholder="e.g. {width} * {height}"
              value={field.formula || ""}
              onChange={(e) => onChange({ ...field, formula: e.target.value })}
            />
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-100">
        <label className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer">
          <input
            type="checkbox"
            className="rounded"
            checked={field.required || false}
            onChange={(e) => onChange({ ...field, required: e.target.checked })}
          />
          Required
        </label>
        {(field.type === "text" || field.type === "number") && (
          <label className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer">
            <input
              type="checkbox"
              className="rounded"
              checked={!!(field as FieldDef & { unique?: boolean }).unique}
              onChange={(e) =>
                onChange({
                  ...field,
                  ...(({ unique: e.target.checked } as unknown) as Partial<FieldDef>),
                })
              }
            />
            Unique
          </label>
        )}
      </div>
    </div>
  );
}

// ─── Nominatim Address Search (shared by Geofence tab) ───────────────────────

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

function AddressSearch({ onSelect }: { onSelect: (lng: number, lat: number) => void }) {
  const [query, setQuery]     = useState("");
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen]       = useState(false);
  const debounceRef           = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!q.trim()) { setResults([]); setOpen(false); return; }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&countrycodes=ng&limit=5`;
        const res = await fetch(url, { headers: { "Accept-Language": "en" } });
        const data: NominatimResult[] = await res.json();
        setResults(data);
        setOpen(data.length > 0);
      } catch { setResults([]); }
      finally { setLoading(false); }
    }, 400);
  }, []);

  return (
    <div style={{ position: "relative", zIndex: 20, width: "100%" }}>
      <div className="flex items-center gap-2 bg-white rounded-xl border border-slate-200 shadow-md px-3 py-2">
        <Search size={14} className="text-slate-400 shrink-0" />
        <input
          className="flex-1 text-sm outline-none bg-transparent text-slate-800 placeholder:text-slate-400 min-w-0"
          placeholder="Search address or place in Nigeria…"
          value={query}
          onChange={e => { setQuery(e.target.value); search(e.target.value); }}
          onFocus={() => results.length > 0 && setOpen(true)}
        />
        {loading && <span className="text-xs text-slate-400 shrink-0">Searching…</span>}
        {query && !loading && (
          <button className="text-slate-300 hover:text-slate-500" onClick={() => { setQuery(""); setResults([]); setOpen(false); }}>
            <X size={13} />
          </button>
        )}
      </div>
      {open && results.length > 0 && (
        <div className="absolute top-full mt-1 left-0 right-0 bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden">
          {results.map(r => (
            <button key={r.place_id}
              className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 border-b border-slate-100 last:border-0"
              onClick={() => {
                onSelect(parseFloat(r.lon), parseFloat(r.lat));
                setQuery(r.display_name.split(",")[0]);
                setOpen(false);
              }}
            >
              <p className="font-medium text-slate-800 truncate">{r.display_name.split(",")[0]}</p>
              <p className="text-xs text-slate-400 truncate">{r.display_name.split(",").slice(1, 3).join(",")}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Geofence Tab ─────────────────────────────────────────────────────────────

function GeofenceTab({
  geofence,
  onChange,
}: {
  geofence: GeoJSON.Polygon | null;
  onChange: (g: GeoJSON.Polygon | null) => void;
}) {
  const mapRef   = useRef<HTMLDivElement>(null);
  const mapInst  = useRef<unknown>(null);
  const drawInst = useRef<unknown>(null);
  const [mapReady, setMapReady] = useState(false);
  const [drawing, setDrawing] = useState(false);
  const [error, setError] = useState("");

  // Fly to address search result
  const handleSearchSelect = useCallback((lng: number, lat: number) => {
    if (!mapInst.current) return;
    (mapInst.current as MaplibreMap).flyTo({ center: [lng, lat], zoom: 13, speed: 1.4 });
  }, []);

  useEffect(() => {
    if (!mapRef.current || mapInst.current) return;

    // Dynamically import maplibre-gl to avoid SSR issues
    import("maplibre-gl").then((maplibre) => {
      const map = new maplibre.Map({
        container: mapRef.current!,
        style: {
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
        },
        center: [8.6753, 9.0820], // Nigeria centroid
        zoom: 6,
      });

      map.on("load", () => {
        mapInst.current = map;
        setMapReady(true);

        // Add geofence source + layers
        map.addSource("geofence", {
          type: "geojson",
          data: geofence
            ? { type: "Feature", geometry: geofence, properties: {} }
            : { type: "FeatureCollection", features: [] },
        });

        map.addLayer({
          id: "geofence-fill",
          type: "fill",
          source: "geofence",
          paint: {
            "fill-color": "#2563eb",
            "fill-opacity": 0.15,
          },
        });

        map.addLayer({
          id: "geofence-line",
          type: "line",
          source: "geofence",
          paint: {
            "line-color": "#2563eb",
            "line-width": 2,
            "line-dasharray": [4, 2],
          },
        });

        // Fit to existing geofence, otherwise stay on Nigeria
        if (geofence) {
          const coords = geofence.coordinates[0];
          const lngs = coords.map((c) => c[0]);
          const lats = coords.map((c) => c[1]);
          map.fitBounds(
            [
              [Math.min(...lngs), Math.min(...lats)],
              [Math.max(...lngs), Math.max(...lats)],
            ],
            { padding: 60 }
          );
        }
      });

      map.on("error", (e) => {
        setError("Map error: " + e.error?.message);
      });
    }).catch(() => {
      setError("Could not load map. Ensure maplibre-gl is installed.");
    });

    return () => {
      if (mapInst.current) {
        (mapInst.current as { remove: () => void }).remove();
        mapInst.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Simple polygon draw mode — click to add vertices, double-click to close
  const startDraw = () => {
    if (!mapInst.current) return;
    const map = mapInst.current as {
      getCanvas: () => HTMLCanvasElement;
      unproject: (p: [number, number]) => { lng: number; lat: number };
      getSource: (id: string) => { setData: (d: unknown) => void };
    };
    setDrawing(true);
    const vertices: [number, number][] = [];
    const canvas = map.getCanvas();
    canvas.style.cursor = "crosshair";

    const onClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const pt = map.unproject([e.clientX - rect.left, e.clientY - rect.top]);
      vertices.push([pt.lng, pt.lat]);

      // Live preview
      if (vertices.length >= 2) {
        const ring = [...vertices, vertices[0]];
        map.getSource("geofence").setData({
          type: "Feature",
          geometry: { type: "Polygon", coordinates: [ring] },
          properties: {},
        });
      }
    };

    const onDblClick = () => {
      canvas.removeEventListener("click", onClick);
      canvas.removeEventListener("dblclick", onDblClick);
      canvas.style.cursor = "";
      setDrawing(false);

      if (vertices.length >= 3) {
        const polygon: GeoJSON.Polygon = {
          type: "Polygon",
          coordinates: [[...vertices, vertices[0]]],
        };
        onChange(polygon);
        map.getSource("geofence").setData({
          type: "Feature",
          geometry: polygon,
          properties: {},
        });
      }
    };

    canvas.addEventListener("click", onClick);
    canvas.addEventListener("dblclick", onDblClick);
  };

  const clearGeofence = () => {
    onChange(null);
    if (mapInst.current) {
      const map = mapInst.current as {
        getSource: (id: string) => { setData: (d: unknown) => void };
      };
      map.getSource("geofence").setData({
        type: "FeatureCollection",
        features: [],
      });
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-5 py-3 bg-white border-b border-slate-200">
        <MapPin size={15} className="text-primary" />
        <span className="text-sm font-medium text-slate-700">
          Geofence Boundary
        </span>
        <span className="text-xs text-slate-400">
          Define the geographic boundary where this form can be submitted.
        </span>
        <div className="ml-auto flex gap-2">
          {geofence ? (
            <>
              <span className="badge badge-green">
                <CheckCircle2 size={10} />
                Boundary set
              </span>
              <button
                onClick={startDraw}
                disabled={drawing}
                className="btn-secondary btn-sm"
              >
                Redraw
              </button>
              <button
                onClick={clearGeofence}
                className="btn-danger-ghost btn-sm"
              >
                <Trash2 size={13} />
                Clear
              </button>
            </>
          ) : (
            <button
              onClick={startDraw}
              disabled={drawing || !mapReady}
              className="btn-primary btn-sm"
            >
              <Plus size={13} />
              {drawing ? "Click to add vertices — double-click to finish" : "Draw Boundary"}
            </button>
          )}
        </div>
      </div>

      {/* Map */}
      <div className="relative flex-1">
            {/* Address search overlay */}
            <div className="absolute top-3 left-3 z-10" style={{ width: "min(340px, calc(100% - 72px))" }}>
              <AddressSearch onSelect={handleSearchSelect} />
            </div>
        {error ? (
          <div className="flex items-center justify-center h-full">
            <div className="empty-state">
              <div className="empty-state-icon bg-red-100 text-red-400">
                <AlertTriangle size={22} />
              </div>
              <p className="font-semibold text-slate-700 mb-1">Map unavailable</p>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        ) : (
          <>
            <div ref={mapRef} className="absolute inset-0" />
            {!mapReady && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-50">
                <div className="text-sm text-slate-400 animate-pulse">Loading map…</div>
              </div>
            )}
            {drawing && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-slate-900/90 text-white text-xs px-4 py-2 rounded-full shadow-lg">
                Click to add vertices · Double-click to finish
              </div>
            )}
          </>
        )}
      </div>

      {/* Geofence JSON preview */}
      {geofence && (
        <div className="border-t border-slate-200 bg-slate-50 px-5 py-3">
          <p className="section-title mb-1">Boundary GeoJSON</p>
          <pre className="text-[10px] text-slate-500 font-mono overflow-x-auto">
            {JSON.stringify(geofence, null, 2).slice(0, 300)}…
          </pre>
        </div>
      )}
    </div>
  );
}

// ─── Settings Tab ─────────────────────────────────────────────────────────────

function SettingsTab({
  schema,
  onUpdate,
  onDelete,
}: {
  schema: FormSchema;
  onUpdate: (patch: Partial<FormSchema>) => Promise<void>;
  onDelete: () => void;
}) {
  const [name, setName] = useState(schema.name);
  const [geometryType, setGeometryType] = useState<GeometryType>(schema.geometry_type);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    setSaving(true);
    await onUpdate({ name, geometry_type: geometryType });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="max-w-xl mx-auto py-8 px-5 space-y-8">
      {/* General */}
      <div className="card p-5 space-y-4">
        <h3 className="font-semibold text-slate-700 text-sm">General</h3>
        <div>
          <label className="label">Form Name</label>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Geometry Type</label>
          <select
            className="input"
            value={geometryType}
            onChange={(e) => setGeometryType(e.target.value as GeometryType)}
          >
            {GEOMETRY_TYPES.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
          <p className="text-xs text-slate-400 mt-1">
            The geometry type determines what the field collector draws on the map.
          </p>
        </div>
        <div className="flex justify-end">
          <button
            onClick={save}
            disabled={saving}
            className="btn-primary btn-sm"
          >
            {saving ? "Saving…" : saved ? "✓ Saved" : "Save Changes"}
          </button>
        </div>
      </div>

      {/* Status */}
      <div className="card p-5 space-y-3">
        <h3 className="font-semibold text-slate-700 text-sm">Status</h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-700">
              {schema.is_published ? "Published" : "Draft"}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              {schema.is_published
                ? "This form is visible to field collectors."
                : "Only admins can see this form."}
            </p>
          </div>
          <span
            className={`badge ${schema.is_published ? "badge-green" : "badge-orange"}`}
          >
            {schema.is_published ? "Live" : "Draft"}
          </span>
        </div>
        <div className="text-xs text-slate-400 pt-1">
          <span>Version {schema.version}</span>
          <span className="mx-2">·</span>
          <span>
            Updated {new Date(schema.updated_at).toLocaleDateString()}
          </span>
        </div>
      </div>

      {/* Danger zone */}
      <div className="danger-zone">
        <h3 className="font-semibold text-red-700 text-sm mb-1">Danger Zone</h3>
        <p className="text-xs text-red-600 mb-4">
          These actions are irreversible. Proceed with caution.
        </p>
        <button onClick={onDelete} className="btn-danger btn-sm">
          <Trash2 size={13} />
          Delete Form
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type Tab = "fields" | "geofence" | "settings";

export default function FormBuilderPage() {
  const { id, formId } = useParams<{ id: string; formId: string }>();
  const router = useRouter();

  const [schema, setSchema]   = useState<FormSchema | null>(null);
  const [fields, setFields]   = useState<FieldDef[]>([]);
  const [geofence, setGeofence] = useState<GeoJSON.Polygon | null>(null);
  const [tab, setTab]         = useState<Tab>("fields");
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [dragFrom, setDragFrom] = useState<number | null>(null);

  // Load form
  useEffect(() => {
    api.get<FormSchema>(`/forms/${formId}`).then((s) => {
      setSchema(s);
      setFields(s.schema?.fields || []);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setGeofence((s as any).geofence ?? null);
    });
  }, [formId]);

  // Add field with defaults
  const addField = (type: FieldDef["type"]) => {
    const f: FieldDef = {
      id: crypto.randomUUID(),
      key: `field_${fields.length + 1}`,
      label: `Field ${fields.length + 1}`,
      type,
      required: false,
      options:
        type === "select" || type === "multiselect"
          ? [...DEFAULT_OPTIONS]
          : undefined,
    };
    setFields((prev) => [...prev, f]);
    setTab("fields");
  };

  // Drag-to-reorder
  const handleDragOver = (e: DragEvent, i: number) => {
    e.preventDefault();
    if (dragFrom === null || dragFrom === i) return;
    setFields((prev) => {
      const next = [...prev];
      const [moved] = next.splice(dragFrom, 1);
      next.splice(i, 0, moved);
      return next;
    });
    setDragFrom(i);
  };

  // Save draft
  const save = useCallback(async () => {
    setSaving(true);
    try {
      await api.patch(`/forms/${formId}`, {
        schema: { fields },
        geofence: geofence ?? undefined,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }, [formId, fields, geofence]);

  // Publish
  const publish = async () => {
    await save();
    await api.post(`/forms/${formId}/publish`, {});
    router.push(`/projects/${id}`);
  };

  // Update settings
  const updateSettings = async (patch: Partial<FormSchema>) => {
    await api.patch(`/forms/${formId}`, patch);
    setSchema((prev) => (prev ? { ...prev, ...patch } : prev));
  };

  // Delete form
  const deleteForm = async () => {
    if (!confirm("Delete this form? This cannot be undone.")) return;
    await api.delete(`/forms/${formId}`);
    router.push(`/projects/${id}`);
  };

  if (!schema) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400 text-sm">
        <div className="animate-pulse">Loading form…</div>
      </div>
    );
  }

  const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "fields",   label: "Fields",   icon: Layers },
    { id: "geofence", label: "Geofence", icon: MapPin },
    { id: "settings", label: "Settings", icon: Settings2 },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* ── Left panel — field palette ─────────────────────── */}
      <div className="w-52 bg-white border-r border-slate-200 flex flex-col shrink-0">
        <div className="px-4 py-3 border-b border-slate-100">
          <p className="section-title">Add Field</p>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {FIELD_TYPES.map(({ type, label, icon: Icon, color }) => (
            <button
              key={type}
              onClick={() => addField(type)}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-600
                         hover:bg-blue-50 hover:text-primary rounded-lg transition-colors text-left"
            >
              <Icon size={14} className={`shrink-0 ${color}`} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Main area ──────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Top toolbar */}
        <div className="studio-toolbar">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href={`/projects/${id}`}
              className="text-slate-400 hover:text-slate-600 transition-colors shrink-0"
            >
              <ChevronLeft size={18} />
            </Link>
            <div className="min-w-0">
              <h2 className="font-semibold text-slate-800 truncate text-sm">
                {schema.name}
              </h2>
              <p className="text-xs text-slate-400">
                {schema.geometry_type} · v{schema.version} ·{" "}
                {fields.length} field{fields.length !== 1 ? "s" : ""}
                {geofence && " · 📍 Geofence set"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`badge ${schema.is_published ? "badge-green" : "badge-orange"}`}
            >
              {schema.is_published ? "Published" : "Draft"}
            </span>
            <button
              onClick={save}
              disabled={saving}
              className="btn-secondary btn-sm"
            >
              <Save size={13} />
              {saving ? "Saving…" : saved ? "✓ Saved" : "Save Draft"}
            </button>
            <button onClick={publish} className="btn-primary btn-sm">
              <Send size={13} />
              Publish
            </button>
          </div>
        </div>

        {/* Tab bar */}
        <div className="tab-bar bg-white">
          {TABS.map(({ id: tid, label, icon: Icon }) => (
            <button
              key={tid}
              onClick={() => setTab(tid)}
              className={`tab-item ${tab === tid ? "active" : ""}`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-hidden">

          {/* Fields tab */}
          {tab === "fields" && (
            <div className="h-full overflow-y-auto p-5 space-y-3">
              {fields.length === 0 ? (
                <div className="empty-state mt-8">
                  <div className="empty-state-icon">
                    <Layers size={22} />
                  </div>
                  <p className="font-semibold text-slate-700 mb-1">
                    No fields yet
                  </p>
                  <p className="text-sm">
                    Click a field type in the left panel to add it.
                  </p>
                </div>
              ) : (
                fields.map((f, i) => (
                  <FieldCard
                    key={f.id}
                    field={f}
                    index={i}
                    total={fields.length}
                    onChange={(updated) =>
                      setFields((prev) =>
                        prev.map((x, j) => (j === i ? updated : x))
                      )
                    }
                    onRemove={() =>
                      setFields((prev) => prev.filter((_, j) => j !== i))
                    }
                    onDragStart={setDragFrom}
                    onDragOver={handleDragOver}
                    onDrop={() => setDragFrom(null)}
                  />
                ))
              )}
            </div>
          )}

          {/* Geofence tab */}
          {tab === "geofence" && (
            <GeofenceTab geofence={geofence} onChange={setGeofence} />
          )}

          {/* Settings tab */}
          {tab === "settings" && (
            <div className="h-full overflow-y-auto">
              <SettingsTab
                schema={schema}
                onUpdate={updateSettings}
                onDelete={deleteForm}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
