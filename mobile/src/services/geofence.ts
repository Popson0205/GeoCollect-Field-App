import * as turf from '@turf/turf';
import * as Location from 'expo-location';
import { Geofence, GPSPoint } from '../types';

export type GeofenceCheckResult = 
  | { status: 'inside' }
  | { status: 'outside'; distance_m: number }
  | { status: 'not_applicable' };

/**
 * Check if a GPS coordinate is inside a geofence.
 * Accounts for buffer_meters tolerance.
 */
export function checkPointInGeofence(
  point: GPSPoint,
  geofence: Geofence
): GeofenceCheckResult {
  if (!geofence.active || geofence.enforcement === 'none') {
    return { status: 'not_applicable' };
  }

  const turfPoint = turf.point([point.longitude, point.latitude]);

  try {
    if (geofence.type === 'radius') {
      // Radius geofence: geometry is a Point with buffer
      const center = geofence.geometry as GeoJSON.Point;
      const centerPoint = turf.point(center.coordinates as [number, number]);
      const distance = turf.distance(turfPoint, centerPoint, { units: 'meters' });
      const radiusM = (geofence as any).radius_meters ?? 500;
      const effectiveRadius = radiusM + (geofence.buffer_meters ?? 0);
      
      if (distance <= effectiveRadius) {
        return { status: 'inside' };
      }
      return { status: 'outside', distance_m: Math.round(distance - effectiveRadius) };
    }

    if (geofence.type === 'polygon') {
      const polygon = geofence.geometry as GeoJSON.Polygon;
      const turfPolygon = turf.polygon(polygon.coordinates as number[][][]);
      
      // Add buffer tolerance
      const buffered = geofence.buffer_meters > 0
        ? turf.buffer(turfPolygon, geofence.buffer_meters, { units: 'meters' })
        : turfPolygon;

      const inside = turf.booleanPointInPolygon(turfPoint, buffered as any);
      if (inside) return { status: 'inside' };

      // Calculate distance to nearest edge for user feedback
      const nearest = turf.nearestPointOnLine(
        turf.polygonToLine(turfPolygon) as any,
        turfPoint
      );
      const dist = turf.distance(turfPoint, nearest, { units: 'meters' });
      return { status: 'outside', distance_m: Math.round(dist) };
    }

    if (geofence.type === 'multi_polygon') {
      const mp = geofence.geometry as GeoJSON.MultiPolygon;
      for (const coords of mp.coordinates) {
        const poly = turf.polygon(coords as number[][][]);
        const buffered = geofence.buffer_meters > 0
          ? turf.buffer(poly, geofence.buffer_meters, { units: 'meters' })
          : poly;
        if (turf.booleanPointInPolygon(turfPoint, buffered as any)) {
          return { status: 'inside' };
        }
      }
      return { status: 'outside', distance_m: 0 };
    }
  } catch (e) {
    console.error('Geofence check error:', e);
  }

  return { status: 'not_applicable' };
}

/**
 * Get current device location with configurable accuracy.
 */
export async function getCurrentLocation(
  accuracyThreshold = 20
): Promise<GPSPoint | null> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') return null;

  try {
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.BestForNavigation,
    });
    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      altitude: location.coords.altitude ?? undefined,
      accuracy: location.coords.accuracy ?? undefined,
      captured_at: new Date(location.timestamp).toISOString(),
    };
  } catch {
    return null;
  }
}

/**
 * Watch location for GPS track recording.
 * Returns a cleanup function.
 */
export async function startGPSTrack(
  onPoint: (point: GPSPoint) => void
): Promise<() => void> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') throw new Error('Location permission denied');

  const sub = await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.BestForNavigation,
      timeInterval: 2000,
      distanceInterval: 3,
    },
    (location) => {
      onPoint({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        altitude: location.coords.altitude ?? undefined,
        accuracy: location.coords.accuracy ?? undefined,
        captured_at: new Date(location.timestamp).toISOString(),
      });
    }
  );

  return () => sub.remove();
}

/**
 * Calculate total distance of a GPS track in meters.
 */
export function calculateTrackDistance(points: GPSPoint[]): number {
  if (points.length < 2) return 0;
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const from = turf.point([points[i-1].longitude, points[i-1].latitude]);
    const to = turf.point([points[i].longitude, points[i].latitude]);
    total += turf.distance(from, to, { units: 'meters' });
  }
  return Math.round(total);
}
