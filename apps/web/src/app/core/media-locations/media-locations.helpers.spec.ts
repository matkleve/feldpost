import { describe, expect, it } from 'vitest';
import { legacyMediaHasGps, mediaHasZoomableLocation } from './media-locations.helpers';

describe('media-locations.helpers', () => {
  it('mediaHasZoomableLocation uses zoomable_location_count when set', () => {
    expect(mediaHasZoomableLocation({ zoomable_location_count: 2, latitude: null, longitude: null })).toBe(
      true,
    );
    expect(mediaHasZoomableLocation({ zoomable_location_count: 0, latitude: 48, longitude: 16 })).toBe(
      false,
    );
  });

  it('legacyMediaHasGps rejects 0,0 placeholder', () => {
    expect(legacyMediaHasGps(0, 0)).toBe(false);
    expect(legacyMediaHasGps(48.2, 16.37)).toBe(true);
  });
});
