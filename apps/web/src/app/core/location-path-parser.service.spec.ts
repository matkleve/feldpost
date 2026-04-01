import { describe, expect, it } from 'vitest';
import { LocationPathParserService } from './location-path-parser.service';

describe('LocationPathParserService', () => {
  const service = new LocationPathParserService();

  it('parses hierarchical folder path into city/zip/street/house components', () => {
    const result = service.parsePathSegments('/Austria/1070_Wien/Denisgasse 12/photo.jpg');

    expect(result.address_context.country).toBe('AT');
    expect(result.address_context.zip).toBe('1070');
    expect(result.address_context.city).toBe('Wien');
    expect(result.address_context.street).toBe('Denisgasse');
    expect(result.address_context.house_number).toBe('12');
    expect(result.confidence_score).toBeGreaterThanOrEqual(0.75);
  });

  it('tracks noise segments and preserves unparsed notes', () => {
    const result = service.parsePathSegments(
      '/Austria/Fotos von Montag/Urlaub/1070_Wien/photo.jpg',
    );

    expect(result.ignored_segments).toContain('Fotos von Montag');
    expect(result.ignored_segments).toContain('Urlaub');
  });

  it('uses filename as highest-priority override when no geographic conflict exists', () => {
    const result = service.parsePathSegments('/Austria/1070_Wien/Folder/Denisgasse 12, Wien.jpg');

    expect(result.source.filename_override).toBe('Denisgasse 12, Wien');
    expect(result.address_context.street).toBe('Denisgasse');
    expect(result.address_context.house_number).toBe('12');
  });

  it('reports missing anchor when both city and zip are absent', () => {
    const result = service.extractAddressFromFilename('Denisgasse 12.jpg');

    expect(result.issue).toBe('missing_anchor');
  });

  it('validates zip with country-specific regex', () => {
    expect(service.validateAddressComponent('1070', 'zip', 'AT')).toBe(true);
    expect(service.validateAddressComponent('10700', 'zip', 'AT')).toBe(false);
    expect(service.validateAddressComponent('10115', 'zip', 'DE')).toBe(true);
  });
});
