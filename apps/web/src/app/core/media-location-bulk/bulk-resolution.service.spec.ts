import { describe, expect, it, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { BulkResolutionService } from './bulk-resolution.service';
import { GeocodingService } from '../geocoding/geocoding.service';
import { MediaLocationUpdateService } from '../media-location-update/media-location-update.service';
import { LocalGeoDataAdapter } from '../location-path-parser/local-geo-data.adapter';
import type { MediaRecord } from '../media-query/media-query.types';

/**
 * End-to-end wiring: a selection plans, the user confirms, and only then does anything get written.
 * @see docs/specs/page/files-page.bulk-resolution.supplement.md
 */

const HIT = {
  lat: 48.2,
  lng: 16.37,
  addressLabel: 'Thalistraße 4, Wien',
  city: 'Wien',
  district: null,
  street: 'Thalistraße',
  streetNumber: '4',
  zip: null,
  country: 'Austria',
};

function media(id: string, relativePath: string, status = 'pending'): MediaRecord {
  return {
    id,
    user_id: 'u',
    organization_id: 'org',
    project_id: null,
    storage_path: null,
    thumbnail_path: null,
    original_filename: relativePath.split('/').pop() ?? null,
    relative_path: relativePath,
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
    location_status: status,
  } as MediaRecord;
}

function setup() {
  const forward = vi.fn(async () => HIT);
  const updateFromAddressSuggestion = vi.fn(async () => ({ ok: true }));

  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      { provide: GeocodingService, useValue: { forward, reverse: vi.fn() } },
      { provide: MediaLocationUpdateService, useValue: { updateFromAddressSuggestion } },
      {
        provide: LocalGeoDataAdapter,
        useValue: {
          getBundeslaender: async () => [{ n: 'Wien', a: [] }],
          getGemeinden: async () => [{ n: 'Wien', b: 'Wien', a: [] }],
          getPlzMap: async () => ({}),
        },
      },
    ],
  });

  return { service: TestBed.inject(BulkResolutionService), forward, updateFromAddressSuggestion };
}

const FOLDER = 'Wien/Thalistraße 4';

describe('BulkResolutionService', () => {
  it('R7: planning writes nothing — confirmation comes first', async () => {
    const { service, forward, updateFromAddressSuggestion } = setup();

    const plan = await service.plan(
      [media('m-1', `${FOLDER}/a.jpg`), media('m-2', `${FOLDER}/b.jpg`)],
      { source: 'folder' },
    );

    expect(plan.eligibleCount).toBe(2);
    expect(plan.geocodeCount).toBe(1);
    expect(forward).not.toHaveBeenCalled();
    expect(updateFromAddressSuggestion).not.toHaveBeenCalled();
  });

  it('R5: running a confirmed plan geocodes once and writes per item', async () => {
    const { service, forward, updateFromAddressSuggestion } = setup();

    const plan = await service.plan(
      [media('m-1', `${FOLDER}/a.jpg`), media('m-2', `${FOLDER}/b.jpg`)],
      { source: 'folder' },
    );
    const report = await service.run(plan);

    expect(forward).toHaveBeenCalledTimes(1);
    expect(updateFromAddressSuggestion).toHaveBeenCalledTimes(2);
    expect(report.resolved).toBe(2);
    expect(report.completed).toBe(true);
  });

  it('B3: an already-located item is skipped, and says why', async () => {
    const { service } = setup();

    const plan = await service.plan(
      [media('m-1', `${FOLDER}/a.jpg`), media('m-2', `${FOLDER}/b.jpg`, 'resolved')],
      { source: 'folder' },
    );

    expect(plan.eligibleCount).toBe(1);
    expect(plan.skipped).toEqual([{ mediaId: 'm-2', reason: 'already_resolved' }]);
  });

  it('carries the full geocode result into the write, not just coordinates', async () => {
    const { service, updateFromAddressSuggestion } = setup();

    const plan = await service.plan([media('m-1', `${FOLDER}/a.jpg`)], { source: 'folder' });
    await service.run(plan);

    expect(updateFromAddressSuggestion).toHaveBeenCalledWith(
      'm-1',
      expect.objectContaining({ street: 'Thalistraße', streetNumber: '4', city: 'Wien' }),
    );
  });

  it('reports progress while running', async () => {
    const { service } = setup();
    const onProgress = vi.fn();

    const plan = await service.plan(
      [media('m-1', `${FOLDER}/a.jpg`), media('m-2', `${FOLDER}/b.jpg`)],
      { source: 'folder' },
    );
    await service.run(plan, { onProgress });

    expect(onProgress).toHaveBeenCalled();
  });

  it('loads the gazetteer once across repeated plans', async () => {
    const { service } = setup();
    const geoData = TestBed.inject(LocalGeoDataAdapter) as unknown as {
      getGemeinden: () => Promise<unknown>;
    };
    const spy = vi.spyOn(geoData, 'getGemeinden');

    await service.plan([media('m-1', `${FOLDER}/a.jpg`)], { source: 'folder' });
    await service.plan([media('m-2', `${FOLDER}/b.jpg`)], { source: 'folder' });

    // The first plan loads it; the second must not. Re-reading 2 114 municipalities per plan would
    // make the confirmation step cost as much as the run.
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
