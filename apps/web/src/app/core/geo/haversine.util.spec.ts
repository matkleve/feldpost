import { describe, expect, it } from 'vitest';
import { haversineKm, haversineMeters, haversineMetersBetween } from './haversine.util';

describe('haversine.util', () => {
  it('returns ~0 for identical coordinates', () => {
    expect(haversineMeters(48.2, 16.37, 48.2, 16.37)).toBe(0);
  });

  it('matches known Vienna intra-city distance (~1.1 km Stephansplatz → Praterstern)', () => {
    const meters = haversineMeters(48.2082, 16.3738, 48.2188, 16.3950);
    expect(meters).toBeGreaterThan(1000);
    expect(meters).toBeLessThan(2500);
  });

  it('haversineMetersBetween agrees with the four-argument form', () => {
    const a = { lat: 48.2, lng: 16.37 };
    const b = { lat: 48.21, lng: 16.38 };
    expect(haversineMetersBetween(a, b)).toBe(haversineMeters(a.lat, a.lng, b.lat, b.lng));
  });

  it('haversineKm is meters divided by 1000', () => {
    const a = { lat: 48.2, lng: 16.37 };
    const b = { lat: 48.21, lng: 16.38 };
    expect(haversineKm(a, b)).toBeCloseTo(haversineMetersBetween(a, b) / 1000, 10);
  });
});
