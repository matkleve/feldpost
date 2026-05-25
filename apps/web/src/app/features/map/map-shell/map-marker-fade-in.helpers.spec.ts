import { describe, expect, it } from 'vitest';
import { resolveMarkerFadeIn } from './map-marker-fade-in.helpers';

const origin = { lat: 48.2, lng: 16.37 };

describe('resolveMarkerFadeIn', () => {
  it('returns true for fresh placement without suppress', () => {
    expect(resolveMarkerFadeIn(null, false)).toBe(true);
  });

  it('returns false when suppressing fade (cache restore)', () => {
    expect(resolveMarkerFadeIn(null, true)).toBe(false);
  });

  it('returns false when spawn origin is set regardless of suppress', () => {
    expect(resolveMarkerFadeIn(origin, false)).toBe(false);
    expect(resolveMarkerFadeIn(origin, true)).toBe(false);
  });
});
