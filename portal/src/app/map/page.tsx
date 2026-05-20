"use client";
import { useEffect, useRef, useState } from "react";
import { Map as MapIcon, Layers } from "lucide-react";
import TopNav from "../../components/TopNav";
import { getUser } from "../../lib/api";

export default function MapViewerPage() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const user = getUser();

  useEffect(() => {
    let map: any;
    (async () => {
      try {
        // @ts-ignore
        const maplibregl = (await import("maplibre-gl")).default;
        if (!mapContainer.current) return;
        map = new maplibregl.Map({
          container: mapContainer.current,
          style: {
            version: 8,
            sources: {
              osm: {
                type: "raster",
                tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
                tileSize: 256,
                attribution: "© OpenStreetMap contributors",
              },
            },
            layers: [{ id: "osm", type: "raster", source: "osm" }],
          },
          center: [0, 20],
          zoom: 2,
        });
        map.on("load", () => setMapLoaded(true));
      } catch (e) {
        console.error("Map init error:", e);
        setMapLoaded(true);
      }
    })();
    return () => { try { map?.remove(); } catch {} };
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      <TopNav user={user ?? undefined} />
      <div className="flex flex-1 overflow-hidden" style={{ height: "calc(100vh - 56px)" }}>
        {/* Sidebar */}
        <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-gray-500" />
              <span className="font-semibold text-gray-800 text-sm">Layers</span>
            </div>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <MapIcon className="w-10 h-10 text-gray-200 mb-3" />
            <p className="text-xs text-gray-400">
              No layers yet. Collect field data to see it on the map.
            </p>
          </div>
        </div>
        {/* Map */}
        <div className="flex-1 relative">
          <div ref={mapContainer} className="absolute inset-0" />
          {!mapLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
              <div className="text-center">
                <MapIcon className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">Loading map...</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
