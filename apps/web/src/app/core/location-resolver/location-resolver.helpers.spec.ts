import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import {
  LOCATED_LOCATION_STATUSES,
  isLocationUnresolvedStatus,
} from './location-resolver.helpers';
import { isBulkEligibleStatus } from '../media-location-bulk/bulk-resolution.selection';
import { deferredLocationBucket } from '../media-location-bulk/deferred-location.selection';
import { MediaQueryService } from '../media-query/media-query.service';
import { MediaLocationsService } from '../media-locations/media-locations.service';
import { MetadataService } from '../metadata/metadata.service';
import { SupabaseService } from '../supabase/supabase.service';
import { MediaDetailDataFacade } from '../media-detail-data/media-detail-data.facade';
import type { MediaRecord } from '../../shared/workspace-pane/media-detail/media-detail-view.types';
import type { MetadataEntry } from '../../shared/workspace-pane/media-detail/media-detail-view.types';
import { createQueryChain } from '../../../test/mocks/supabase-chain.mock';

/**
 * One derivation of `location_unresolved`, and the decision it encodes (#222).
 *
 * @see docs/specs/service/location-resolver/README.md § Location Status Contract
 */

/** Every status the client can meet on a read: canonical, legacy, and the unknown case. */
const ALL_READABLE_STATUSES: readonly (string | null)[] = [
  'pending',
  'resolved',
  'unresolvable',
  'partial',
  'gps',
  'no_gps',
  'unresolved',
  'something_new',
  null,
];

describe('isLocationUnresolvedStatus', () => {
  it('counts partial as unresolved — an address with no pin is work still to do', () => {
    // `resolveUploadLocationStatus` writes 'partial' for exactly one case: an address was
    // established and no coordinates were (D-10, area-only). Archiv/Wien/1010/IMG_0090.jpg
    // resolves to "Wien 1010" with no street and no pin; the deferred-location backlog counts it
    // as improvable work, so a gallery calling it located would contradict its own badge.
    expect(isLocationUnresolvedStatus('partial')).toBe(true);
  });

  it('counts resolved and its legacy spelling gps as located', () => {
    expect(isLocationUnresolvedStatus('resolved')).toBe(false);
    expect(isLocationUnresolvedStatus('gps')).toBe(false);
  });

  it('counts pending, unresolvable and the legacy spellings as unresolved', () => {
    // `unresolvable` is terminal for the resolver, not for the user: the item still has no
    // location, and a human answer is exactly what it is waiting for.
    for (const status of ['pending', 'unresolvable', 'no_gps', 'unresolved']) {
      expect(isLocationUnresolvedStatus(status), status).toBe(true);
    }
  });

  it('fails toward unresolved for an unknown or absent status', () => {
    expect(isLocationUnresolvedStatus(null)).toBe(true);
    expect(isLocationUnresolvedStatus(undefined)).toBe(true);
    expect(isLocationUnresolvedStatus('something_new')).toBe(true);
  });

  it('is the exact complement of the located set the count queries filter on', () => {
    for (const status of ALL_READABLE_STATUSES) {
      expect(isLocationUnresolvedStatus(status), String(status)).toBe(
        !(status != null && LOCATED_LOCATION_STATUSES.includes(status)),
      );
    }
  });
});

describe('one derivation: the status consumers cannot disagree', () => {
  it('bulk eligibility gives the same answer for every readable status', () => {
    for (const status of ALL_READABLE_STATUSES) {
      expect(isBulkEligibleStatus(status), String(status)).toBe(
        isLocationUnresolvedStatus(status),
      );
    }
  });

  it('the deferred-location backlog calls located exactly what the predicate calls resolved', () => {
    // The badge says "158 items could be located more precisely". If these two drifted, the badge
    // would offer work on rows the gallery shows as done, or hide rows it shows as pending.
    for (const status of ALL_READABLE_STATUSES) {
      const bucket = deferredLocationBucket({ id: 'm-1', location_status: status });
      expect(bucket === 'located', String(status)).toBe(!isLocationUnresolvedStatus(status));
    }
  });
});

/** A `media_items` row as the D-10 area-only case leaves it: an address, no coordinates. */
const PARTIAL_ROW = {
  id: 'media-1',
  source_image_id: 'img-1',
  organization_id: 'org-1',
  created_by: 'user-1',
  storage_path: 'org-1/user-1/IMG_0090.jpg',
  thumbnail_path: null,
  original_filename: 'IMG_0090.jpg',
  relative_path: 'Archiv/Wien/1010/IMG_0090.jpg',
  exif_raw: null,
  latitude: null,
  longitude: null,
  exif_latitude: null,
  exif_longitude: null,
  captured_at: null,
  created_at: '2026-01-01T00:00:00.000Z',
  mime_type: 'image/jpeg',
  gps_assignment_allowed: true,
  location_status: 'partial',
  address_label: 'Wien 1010',
  street: null,
  city: 'Wien',
  district: null,
  country: 'AT',
  address_field_meta: null,
  address_notes: null,
  location_mismatch_meters: null,
};

function loadThroughMediaQuery(row: Record<string, unknown>): Promise<MediaRecord[]> {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      MediaQueryService,
      {
        provide: SupabaseService,
        useValue: {
          client: {
            auth: { getUser: async () => ({ data: { user: { id: 'user-1' } } }) },
            from: vi.fn(() => createQueryChain({ data: [row], error: null })),
          },
        },
      },
      { provide: MediaLocationsService, useValue: {} },
      { provide: MetadataService, useValue: {} },
    ],
  });

  return TestBed.inject(MediaQueryService)
    .loadCurrentUserMedia()
    .then((result) => result.items as MediaRecord[]);
}

async function loadThroughMediaDetail(row: Record<string, unknown>): Promise<MediaRecord | null> {
  const media = signal<MediaRecord | null>(null);
  const facade = new MediaDetailDataFacade({
    services: {
      supabase: {
        client: {
          from: vi.fn((table: string) =>
            table === 'media_items'
              ? createQueryChain({ data: row, error: null })
              : createQueryChain({ data: [], error: null }),
          ),
          rpc: vi.fn(() => createQueryChain({ data: [], error: null })),
        },
      },
      metadata: {
        loadMetadataEntriesForMediaItem: vi.fn(async () => []),
        listMetadataKeyDefinitionsForOrganization: vi.fn(async () => []),
      },
      mediaDownloadService: {
        markNoMedia: vi.fn(),
        getSignedUrl: vi.fn(async () => ({ url: 'url' })),
        preload: vi.fn(async () => true),
      },
      projectMemberships: { loadProjectMemberships: vi.fn(async () => {}) },
    },
    signals: {
      media,
      metadata: signal<MetadataEntry[]>([]),
      loading: signal(false),
      error: signal<string | null>(null),
      projectOptions: signal([]),
      metadataKeyDefinitions: signal([]),
    },
    computed: { mediaType: () => 'image', mediaMimeType: () => 'image/jpeg' },
    // Deps are structural stubs, not the real services — cast once, at the seam.
  } as never);

  await facade.loadMedia('img-1', new AbortController().signal);
  return media();
}

describe('location_unresolved: the gallery and the detail pane answer the same row alike', () => {
  it('a partial row is unresolved on both load paths', async () => {
    // This is the bug #222 names. Before the fix `media-query.service.ts` returned true here and
    // `media-detail-data.facade.ts` returned false, so the gallery badge and the detail pane
    // contradicted each other on the same photo.
    const [fromGallery] = await loadThroughMediaQuery(PARTIAL_ROW);
    const fromDetail = await loadThroughMediaDetail(PARTIAL_ROW);

    expect(fromGallery.location_unresolved).toBe(true);
    expect(fromDetail?.location_unresolved).toBe(true);
  });

  it('agrees on every status a read can return, not only on partial', async () => {
    for (const status of ALL_READABLE_STATUSES) {
      const row = { ...PARTIAL_ROW, location_status: status };
      const [fromGallery] = await loadThroughMediaQuery(row);
      const fromDetail = await loadThroughMediaDetail(row);

      expect(fromGallery.location_unresolved, String(status)).toBe(
        isLocationUnresolvedStatus(status),
      );
      expect(fromDetail?.location_unresolved, String(status)).toBe(
        fromGallery.location_unresolved,
      );
    }
  });
});
