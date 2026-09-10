/**
 * Shared great-circle distance helpers (WGS84 mean Earth radius).
 */

const EARTH_RADIUS_METERS = 6371000;

export function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (degrees: number): number => (degrees * Math.PI) / 180;

  const deltaLat = toRad(lat2 - lat1);
  const deltaLng = toRad(lng2 - lng1);
  const radLat1 = toRad(lat1);
  const radLat2 = toRad(lat2);

  const sinLat = Math.sin(deltaLat / 2);
  const sinLng = Math.sin(deltaLng / 2);
  const h =
    sinLat * sinLat + Math.cos(radLat1) * Math.cos(radLat2) * sinLng * sinLng;

  return 2 * EARTH_RADIUS_METERS * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function haversineMetersBetween(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  return haversineMeters(a.lat, a.lng, b.lat, b.lng);
}

/** Kilometre variant used by location-path-parser disambiguation scoring. */
export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  return haversineMetersBetween(a, b) / 1000;
}
