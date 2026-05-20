// field/src/components/GeofenceStatusBar.tsx
// Map overlay showing active geofence zones and last trigger event.
// Mount inside CollectPage above the map.

import type { GeofenceState } from "../lib/useGeofence";
import type { GeofenceTriggerEvent } from "../lib/geofence";

interface GeofenceStatusBarProps {
  state: GeofenceState;
}

const TRIGGER_ICONS: Record<string, string> = {
  entry:     "✅",
  exit:      "🚪",
  dwell:     "⏱️",
  proximity: "📡",
};

const TRIGGER_COLORS: Record<string, string> = {
  entry:     "#22c55e",
  exit:      "#f59e0b",
  dwell:     "#6366f1",
  proximity: "#0ea5e9",
};

export default function GeofenceStatusBar({ state }: GeofenceStatusBarProps) {
  const { activeZones, lastEvent, zoneCount, isWatching } = state;

  if (zoneCount === 0) return null; // No geofences configured

  const hasActive = activeZones.length > 0;

  return (
    <div style={{
      position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)",
      zIndex: 10, display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
      pointerEvents: "none",
    }}>
      {/* Zone status pill */}
      <div style={{
        display: "flex", alignItems: "center", gap: 6,
        background: hasActive ? "#dcfce7" : "rgba(255,255,255,0.92)",
        border: `1px solid ${hasActive ? "#86efac" : "#e2e8f0"}`,
        borderRadius: 20, padding: "4px 12px", fontSize: 12, fontWeight: 600,
        color: hasActive ? "#166534" : "#64748b",
        boxShadow: "0 1px 4px rgba(0,0,0,0.12)",
      }}>
        <span style={{
          width: 8, height: 8, borderRadius: "50%",
          background: isWatching ? (hasActive ? "#22c55e" : "#94a3b8") : "#ef4444",
          display: "inline-block",
        }} />
        {hasActive
          ? `Inside zone: ${activeZones.length} active`
          : `${zoneCount} geofence${zoneCount > 1 ? "s" : ""} loaded`}
      </div>

      {/* Last event toast */}
      {lastEvent && <TriggerToast event={lastEvent} />}
    </div>
  );
}

function TriggerToast({ event }: { event: GeofenceTriggerEvent }) {
  const icon  = TRIGGER_ICONS[event.type]  ?? "📍";
  const color = TRIGGER_COLORS[event.type] ?? "#64748b";

  const message = (() => {
    switch (event.type) {
      case "entry":
        return `Entered: ${event.zone?.formName}`;
      case "exit":
        return `Exited: ${event.zone?.formName}`;
      case "dwell":
        return `Dwell reached in: ${event.zone?.formName}`;
      case "proximity":
        return `Near: ${event.target?.label}`;
      default:
        return "Geofence event";
    }
  })();

  return (
    <div style={{
      background: "#fff", borderRadius: 12, padding: "6px 14px",
      border: `1px solid ${color}`, fontSize: 12, fontWeight: 600,
      color: "#0f172a", boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
      display: "flex", alignItems: "center", gap: 6,
    }}>
      <span>{icon}</span>
      <span>{message}</span>
    </div>
  );
}
