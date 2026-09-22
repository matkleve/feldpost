import { describe, expect, it } from 'vitest';
import { toBulkCandidates, isBulkEligibleStatus } from './bulk-resolution.selection';
import type { MediaRecord } from '../media-query/media-query.types';

/**
 * Turning a selection of media rows into engine candidates.
 * @see docs/specs/page/files-page.bulk-resolution.supplement.md
 */

function media(overrides: Partial<MediaRecord> = {}): MediaRecord {
  return {
    id: 'm-1',
    user_id: 'u-1',
    organization_id: 'org-1',
    project_id: null,
    storage_path: 'org-1/u-1/photo.jpg',
    thumbnail_path: null,
    original_filename: 'photo.jpg',
    relative_path: 'Wien/Thalistraße 4/photo.jpg',
    latitude: null,
    longitude: null,
    exif_latitude: null,
    exif_longitude: null,
    captured_at: null,
    has_time: false,
    created_at: '2026-01-01',
    address_label: null,
    street: null,
    city: null,
    district: null,
    country: null,
    direction: null,
    location_unresolved: true,
    location_status: 'pending',
    ...overrides,
  } as MediaRecord;
}

describe('isBulkEligibleStatus', () => {
  it('treats a resolved or gps-placed item as already located', () => {
    expect(isBulkEligibleStatus('resolved')).toBe(false);
    expect(isBulkEligibleStatus('gps')).toBe(false);
  });

  it('treats pending, no_gps, unresolved and partial as needing resolution', () => {
    for (const status of ['pending', 'no_gps', 'unresolved', 'partial']) {
      expect(isBulkEligibleStatus(status)).toBe(true);
    }
  });

  it('treats unresolvable as eligible — a human answer is exactly what it needs', () => {
    // The pipeline gave up on it. That is the case bulk resolution exists for, so excluding it
    // would leave the hardest items permanently unreachable.
    expect(isBulkEligibleStatus('unresolvable')).toBe(true);
  });

  it('treats an unknown or absent status as needing resolution', () => {
    // Fail toward offering the work rather than silently skipping rows.
    expect(isBulkEligibleStatus(null)).toBe(true);
    expect(isBulkEligibleStatus('something_new')).toBe(true);
  });
});

describe('toBulkCandidates', () => {
  it('carries the raw evidence the planner derives addresses from', () => {
    const [candidate] = toBulkCandidates([media()]);

    expect(candidate).toMatchObject({
      mediaId: 'm-1',
      relativePath: 'Wien/Thalistraße 4/photo.jpg',
      originalFilename: 'photo.jpg',
      hasLocation: false,
    });
  });

  it('marks a resolved item as already located, so the planner skips it', () => {
    const [candidate] = toBulkCandidates([media({ location_status: 'resolved' })]);

    expect(candidate.hasLocation).toBe(true);
  });

  it('passes EXIF coordinates through when both are present', () => {
    const [candidate] = toBulkCandidates([
      media({ exif_latitude: 48.2, exif_longitude: 16.37 }),
    ]);

    expect(candidate.exifCoords).toEqual({ lat: 48.2, lng: 16.37 });
  });

  it('treats a half-present EXIF pair as no coordinates at all', () => {
    const [candidate] = toBulkCandidates([media({ exif_latitude: 48.2, exif_longitude: null })]);

    expect(candidate.exifCoords).toBeNull();
  });

  it('reads location_status, not a location_unresolved value handed in on the row', () => {
    // `location_unresolved` is derived from `location_status` by whichever mapper loaded the row
    // (#222), so a record carrying a stale or hand-built value must not steer a run. The status is
    // the column; the boolean is a projection of it.
    const [candidate] = toBulkCandidates([
      media({ location_status: 'resolved', location_unresolved: true }),
    ]);

    expect(candidate.hasLocation).toBe(true);
  });

  it('maps an empty selection to an empty list rather than throwing', () => {
    expect(toBulkCandidates([])).toEqual([]);
  });
});
