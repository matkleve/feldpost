import { describe, expect, it } from 'vitest';
import { buildCartoStreetTileUrlTemplate } from './map-basemap-layer.helpers';

describe('buildCartoStreetTileUrlTemplate', () => {
  it('returns the legacy URL when no key is configured', () => {
    expect(buildCartoStreetTileUrlTemplate('light_all', '')).toBe(
      'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    );
    expect(buildCartoStreetTileUrlTemplate('dark_all', null)).toBe(
      'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    );
  });

  it('appends the CARTO key query param when configured', () => {
    expect(buildCartoStreetTileUrlTemplate('rastertiles/voyager', 'abc-123')).toBe(
      'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=abc-123',
    );
  });
});
