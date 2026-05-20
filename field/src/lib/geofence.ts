// field/src/lib/geofence.ts
// Client-side geofencing engine using Turf.js.
// Works fully offline — geofence polygons are loaded from IndexedDB (cached form schemas).
//
// Trigger types:
//   entry    — fires once when user enters a geofence zone
//   exit     — fires once when user exits a geofence zone
//   dwell    — fires after N minutes of continuous presence inside a zone
//   proximity — fires when within X metres of a point feature

import * as turf from "@turf/turf";
import { getForms } from "./db";

// ── Types ─────────────────────────────────────────────────────────────────────

export type TriggerType = "entry" | "exit" | "dwell" | "proximity";

export interface GeofenceZone {
  formId:        string;
  formName:      string;
  polygon:       GeoJSON.Polygon;
  dwellMinutes?: number;   // for dwell trigger
  autoPopulate?: Record<string, string>; // fieldKey → value
}

export interface ProximityTarget {
  featureId: string;
  label:     string;
  point:     GeoJSON.Point;
  radiusMetres: number;
}

export interface GeofenceTriggerEvent {
  type:        TriggerType;
  zone?:       GeofenceZone;
  target?:     ProximityTarget;
  position:    [number, number]; // [lng, lat]
  timestamp:   number;
}

type TriggerCallback = (event: GeofenceTriggerEvent) => void;

// ── GeofenceEngine ────────────────────────────────────────────────────────────

export class GeofenceEngine {
  private zones:    GeofenceZone[]      = [];
  private targets:  ProximityTarget[]   = [];
  private callbacks: TriggerCallback[]  = [];

  // Track state to avoid re-firing entry/exit
  private insideZones = new Set<string>();   // formIds currently inside
  private dwellTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private firedProximity = new Set<string>(); // featureIds proximity already fired

  /** Load geofence zones from cached form schemas in IndexedDB. */
  async loadFromCache(): Promise<void> {
    const forms = await getForms() as Array<{
      id: string; name: string;
      geofence?: GeoJSON.Polygon | null;
      schema?: { dwellMinutes?: number; autoPopulate?: Record<string, string> };
    }>;

    this.zones = forms
      .filter((f) => f.geofence)
      .map((f) => ({
        formId:       f.id,
        formName:     f.name,
        polygon:      f.geofence!,
        dwellMinutes: f.schema?.dwellMinutes,
        autoPopulate: f.schema?.autoPopulate,
      }));

    console.log(`[GeofenceEngine] Loaded ${this.zones.length} zone(s) from cache`);
  }

  /** Add point feature proximity targets (e.g. from a reference layer). */
  setProximityTargets(targets: ProximityTarget[]): void {
    this.targets = targets;
    this.firedProximity.clear();
  }

  on(callback: TriggerCallback): () => void {
    this.callbacks.push(callback);
    return () => { this.callbacks = this.callbacks.filter((c) => c !== callback); };
  }

  private emit(event: GeofenceTriggerEvent): void {
    this.callbacks.forEach((cb) => cb(event));
  }

  /**
   * Call this whenever the user's GPS position updates.
   * Evaluates all trigger types and fires callbacks as needed.
   */
  update(lng: number, lat: number): void {
    const position: [number, number] = [lng, lat];
    const pt = turf.point(position);

    // ── Zone entry / exit / dwell ────────────────────────────────────────────
    for (const zone of this.zones) {
      const poly   = turf.polygon(zone.polygon.coordinates);
      const inside = turf.booleanPointInPolygon(pt, poly);

      if (inside && !this.insideZones.has(zone.formId)) {
        // Entry
        this.insideZones.add(zone.formId);
        this.emit({ type: "entry", zone, position, timestamp: Date.now() });

        // Start dwell timer if configured
        if (zone.dwellMinutes && zone.dwellMinutes > 0) {
          const timer = setTimeout(() => {
            if (this.insideZones.has(zone.formId)) {
              this.emit({ type: "dwell", zone, position, timestamp: Date.now() });
            }
          }, zone.dwellMinutes * 60 * 1000);
          this.dwellTimers.set(zone.formId, timer);
        }
      }

      if (!inside && this.insideZones.has(zone.formId)) {
        // Exit
        this.insideZones.delete(zone.formId);
        this.emit({ type: "exit", zone, position, timestamp: Date.now() });

        // Cancel dwell timer
        const timer = this.dwellTimers.get(zone.formId);
        if (timer) { clearTimeout(timer); this.dwellTimers.delete(zone.formId); }
      }
    }

    // ── Proximity ────────────────────────────────────────────────────────────
    for (const target of this.targets) {
      if (this.firedProximity.has(target.featureId)) continue;

      const targetPt   = turf.point(target.point.coordinates as [number, number]);
      const distMetres = turf.distance(pt, targetPt, { units: "meters" });

      if (distMetres <= target.radiusMetres) {
        this.firedProximity.add(target.featureId);
        this.emit({ type: "proximity", target, position, timestamp: Date.now() });
      }
    }
  }

  /** Reset all state (e.g. on form change or project switch). */
  reset(): void {
    this.insideZones.clear();
    this.dwellTimers.forEach(clearTimeout);
    this.dwellTimers.clear();
    this.firedProximity.clear();
  }

  destroy(): void {
    this.reset();
    this.callbacks = [];
  }

  get activeZoneCount(): number { return this.insideZones.size; }
  get loadedZoneCount(): number { return this.zones.length; }
}

// Singleton — one engine per Field app session
export const geofenceEngine = new GeofenceEngine();
