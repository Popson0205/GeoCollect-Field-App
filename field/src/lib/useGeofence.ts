// field/src/lib/useGeofence.ts
// React hook that wires the GeofenceEngine into the GPS watch position.
// Handles entry/exit/dwell/proximity callbacks and exposes UI state.

import { useEffect, useRef, useState, useCallback } from "react";
import { geofenceEngine, type GeofenceTriggerEvent } from "./geofence";

export interface GeofenceState {
  activeZones:    string[];    // formIds of zones currently inside
  lastEvent:      GeofenceTriggerEvent | null;
  zoneCount:      number;      // total loaded zones
  isWatching:     boolean;
}

interface UseGeofenceOptions {
  /** Called on every geofence trigger event */
  onTrigger?: (event: GeofenceTriggerEvent) => void;
  /** Auto-populate form values on entry trigger */
  onAutoPopulate?: (fields: Record<string, string>) => void;
  /** Called when exit trigger fires with an open form */
  onExitPrompt?: (formId: string) => void;
}

export function useGeofence(opts: UseGeofenceOptions = {}): GeofenceState {
  const [activeZones, setActiveZones] = useState<string[]>([]);
  const [lastEvent,   setLastEvent]   = useState<GeofenceTriggerEvent | null>(null);
  const [isWatching,  setIsWatching]  = useState(false);
  const watchId = useRef<number | null>(null);
  const optsRef = useRef(opts);
  optsRef.current = opts;

  // Load geofence zones from cached form schemas
  useEffect(() => {
    geofenceEngine.loadFromCache().catch(console.error);
  }, []);

  // Subscribe to trigger events
  useEffect(() => {
    const unsub = geofenceEngine.on((event) => {
      setLastEvent(event);
      optsRef.current.onTrigger?.(event);

      if (event.type === "entry") {
        setActiveZones((prev) => [...new Set([...prev, event.zone!.formId])]);
        if (event.zone?.autoPopulate) {
          optsRef.current.onAutoPopulate?.(event.zone.autoPopulate);
        }
      }

      if (event.type === "exit") {
        setActiveZones((prev) => prev.filter((id) => id !== event.zone!.formId));
        optsRef.current.onExitPrompt?.(event.zone!.formId);
      }
    });
    return unsub;
  }, []);

  // Start GPS watch
  useEffect(() => {
    if (!navigator.geolocation) return;

    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        geofenceEngine.update(pos.coords.longitude, pos.coords.latitude);
        setIsWatching(true);
      },
      (err) => console.warn("[Geofence] GPS error:", err.message),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );

    return () => {
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current);
      }
      geofenceEngine.reset();
      setIsWatching(false);
    };
  }, []);

  return {
    activeZones,
    lastEvent,
    zoneCount: geofenceEngine.loadedZoneCount,
    isWatching,
  };
}
