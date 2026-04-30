import type { IemNetworkGeoJsonFeature } from './geojsonNetwork';

const EARTH_RADIUS_KM = 6371;

function toRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Great-circle distance in kilometers between WGS84 [lat,lng] points. */
export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const φ1 = toRadians(lat1);
  const φ2 = toRadians(lat2);
  const Δφ = toRadians(lat2 - lat1);
  const Δλ = toRadians(lng2 - lng1);
  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

export interface NearestIemStation {
  feature: IemNetworkGeoJsonFeature;
  distanceKm: number;
}

/**
 * Return the closest online feature to the EPW LOCATION (EPSG:4326 ordering: lat,lng).
 * GeoJSON uses [lon, lat].
 */
export function nearestNetworkFeature(features: IemNetworkGeoJsonFeature[], lat: number, lng: number): NearestIemStation | null {
  if (!features.length) return null;

  let best: NearestIemStation | null = null;

  for (const f of features) {
    if (f.geometry?.type !== 'Point') continue;
    const [flon, flat] = f.geometry.coordinates;
    const km = haversineKm(lat, lng, flat, flon);
    if (!best || km < best.distanceKm) {
      best = { feature: f, distanceKm: km };
    }
  }

  return best;
}
