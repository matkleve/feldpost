import { describe, expect, it } from 'vitest';
import type { MediaRecord } from '../../core/media-query/media-query.types';
import {
  formatMediaItemRowCapturedAt,
  resolveMediaItemRowPrimaryLabel,
  resolveMediaItemRowSecondaryLine,
} from './media-item-row-display.helpers';

const baseRecord = (): MediaRecord => ({
  id: '1',
  user_id: 'u',
  organization_id: null,
  project_id: null,
  storage_path: 'org/a/photo.jpg',
  thumbnail_path: 'org/a/thumb.jpg',
  original_filename: 'IMG_001.jpg',
  latitude: null,
  longitude: null,
  exif_latitude: null,
  exif_longitude: null,
  captured_at: '2025-06-15T10:30:00Z',
  has_time: true,
  created_at: '2025-06-15T10:30:00Z',
  address_label: 'Bahnhofstrasse 1, Zürich',
  street: null,
  city: 'Zürich',
  district: null,
  country: 'CH',
  direction: null,
  location_unresolved: false,
});

describe('media-item-row-display.helpers', () => {
  it('prefers address_label for primary label', () => {
    expect(resolveMediaItemRowPrimaryLabel(baseRecord())).toBe('Bahnhofstrasse 1, Zürich');
  });

  it('falls back to original_filename when address is empty', () => {
    const record = { ...baseRecord(), address_label: null };
    expect(resolveMediaItemRowPrimaryLabel(record)).toBe('IMG_001.jpg');
  });

  it('builds secondary line with date, file type, and non-duplicate city', () => {
    const record = { ...baseRecord(), address_label: 'IMG_001.jpg', city: 'Bern' };
    const secondary = resolveMediaItemRowSecondaryLine(record, 'en');
    expect(secondary).toContain('JPEG');
    expect(secondary).toContain('Bern');
    expect(secondary).toMatch(/·/);
  });

  it('formats capture date with time when has_time is true', () => {
    const formatted = formatMediaItemRowCapturedAt('2025-06-15T10:30:00Z', true, 'en');
    expect(formatted.length).toBeGreaterThan(0);
  });
});
