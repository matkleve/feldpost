/**
 * Shared test infrastructure for MediaDetailViewComponent spec suite.
 *
 * Exports:
 *  - MOCK_MEDIA / MOCK_CORRECTED_MEDIA / MOCK_METADATA — test fixtures
 *  - buildFakeClient()   — chainable Supabase client fake
 *  - setup()             — creates TestBed + component in one call
 *  - setImageId()        — injects an imageId signal into the component
 */

import { ComponentRef, NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  MediaDetailViewComponent,
  MediaRecord,
  MetadataEntry,
} from './media-detail-view.component';
import { SupabaseService } from '../../../core/supabase/supabase.service';
import { GeocodingService } from '../../../core/geocoding/geocoding.service';
import { createQueryChain, withChainFallback } from '../../../../test/mocks/supabase-chain.mock';
import { MediaLocationsService } from '../../../core/media-locations/media-locations.service';
import { MetadataService } from '../../../core/metadata/metadata.service';
import { MediaLocationUpdateService } from '../../../core/media-location-update/media-location-update.service';

// ── Test fixtures ─────────────────────────────────────────────────────────────

export const MOCK_MEDIA: MediaRecord = {
  id: 'img-001',
  user_id: 'user-001',
  organization_id: 'org-001',
  project_id: 'proj-001',
  storage_path: 'org-001/user-001/photo.jpg',
  thumbnail_path: 'org-001/user-001/photo_thumb.jpg',
  latitude: 48.2082,
  longitude: 16.3738,
  exif_latitude: 48.2082,
  exif_longitude: 16.3738,
  captured_at: '2025-06-15T10:30:00Z',
  created_at: '2025-06-15T12:00:00Z',
  address_label: 'Stephansplatz 1, Wien',
  street: 'Stephansplatz',
  city: 'Wien',
  district: 'Innere Stadt',
  country: 'Austria',
  direction: 180,
  location_unresolved: false,
  has_time: true,
};

export const MOCK_CORRECTED_MEDIA: MediaRecord = {
  ...MOCK_MEDIA,
  latitude: 48.209,
  longitude: 16.3745,
};

export const MOCK_METADATA: MetadataEntry[] = [
  { metadataKeyId: 'mk-001', key: 'Building type', keyType: 'text', value: 'Residential' },
  { metadataKeyId: 'mk-002', key: 'Floor', keyType: 'text', value: '3rd' },
];

// ── Fake Supabase client ──────────────────────────────────────────────────────

/**
 * Builds a chainable fake Supabase client.
 * Each table builder records its calls and returns configurable responses.
 */
/**
 * Stub for MediaLocationsService.
 *
 * Address display fields (address_label, street, city, district, country) no
 * longer live on media_items — 20260525130000 dropped those columns and
 * MediaDetailFieldsHelper routes them through this service instead. Without a
 * stub the real service runs against the fake client, every location write
 * fails, and saveImageField rolls its optimistic update back, so tests see the
 * pre-edit value and fail for a reason unrelated to what they assert.
 */
export function buildFakeMediaLocations(mediaItemId = MOCK_MEDIA.id) {
  const row = (patch: Record<string, unknown> = {}) => ({
    id: 'loc-001',
    link_id: 'link-001',
    media_item_id: mediaItemId,
    organization_id: MOCK_MEDIA.organization_id,
    street: null,
    house_number: null,
    staircase: null,
    door: null,
    floor: null,
    postcode: null,
    extra_information: null,
    city: null,
    district: null,
    country: null,
    latitude: null,
    longitude: null,
    address_label: null,
    ...patch,
  });

  const ok = vi.fn(async (input: Record<string, unknown> = {}) => {
    const { locationId, mediaItemId: _ignored, ...patch } = input;
    return { ok: true as const, row: row({ ...patch, id: locationId ?? 'loc-001' }) };
  });

  return {
    addLocation: ok,
    updateLocation: ok,
    linkExistingLocation: ok,
    replaceWithExistingLocation: ok,
    addFromExifCoordinates: ok,
    addFromFreeText: ok,
    addFromGeocodeSuggestion: ok,
    replaceLocationLinkFromFreeText: ok,
    replaceLocationLinkFromGeocode: ok,
    deleteLocation: vi.fn(async () => ({ ok: true as const })),
    listForMedia: vi.fn(async () => ({ ok: true as const, rows: [] })),
    invalidateListCache: vi.fn(),
  };
}

/**
 * Stub for MetadataService.
 *
 * Metadata writes moved behind this service, so the component no longer calls
 * media_metadata directly. Unstubbed, the real service runs against the fake
 * client, every save returns false, and the helper rolls its optimistic update
 * back — leaving tests asserting the pre-edit value.
 *
 * validateMetadataValueForSave delegates to the real pure validator so tests
 * keep exercising real normalisation rather than a rubber stamp.
 */
export function buildFakeMetadataService() {
  return {
    validateMetadataValueForSave: vi.fn((_type: string, rawValue: string) => ({
      valid: true,
      normalizedValue: rawValue.trim(),
    })),
    saveMetadataValueByLookupId: vi.fn(async () => true),
    addMetadataValueByLookupId: vi.fn(
      async (
        _lookupId: string,
        _orgId: string | null,
        keyName: string,
        keyType: 'text' | 'number' | 'date',
      ) => ({ metadataKeyId: 'mk-new', key: keyName, keyType }),
    ),
    removeMetadataValueByLookupId: vi.fn(async () => true),
  };
}

/**
 * Stub for MediaLocationUpdateService.
 *
 * applyAddressSuggestion writes the address through this service (which calls
 * the resolve_media_location RPC) rather than updating media_items columns.
 * Unstubbed it returns not-ok, and the helper reverts its optimistic update.
 */
export function buildFakeMediaLocationUpdate() {
  return {
    updateFromAddressSuggestion: vi.fn(
      async (_mediaId: string, suggestion: { lat?: number; lng?: number }) => ({
        ok: true,
        lat: suggestion.lat,
        lng: suggestion.lng,
      }),
    ),
  };
}

export function buildFakeClient() {
  const updateEqFn = vi.fn().mockResolvedValue({ data: null, error: null });
  const updateFn = vi.fn().mockReturnValue({ eq: updateEqFn, or: updateEqFn });

  const upsertFn = vi.fn().mockResolvedValue({ data: null, error: null });

  const deleteEq2Fn = vi.fn().mockResolvedValue({ data: null, error: null });
  const deleteEq1Fn = vi.fn().mockReturnValue({ eq: deleteEq2Fn });
  const deleteFn = vi.fn().mockReturnValue({ eq: deleteEq1Fn, or: deleteEq2Fn });

  const maybeSingleFn = vi.fn().mockResolvedValue({ data: null, error: null });
  const insertSelectSingleFn = vi.fn().mockResolvedValue({
    data: { id: 'mk-new' },
    error: null,
  });
  const insertSelectFn = vi.fn().mockReturnValue({ single: insertSelectSingleFn });
  const insertFn = vi.fn().mockReturnValue({ select: insertSelectFn });

  const imageSingleFn = vi.fn().mockResolvedValue({ data: MOCK_MEDIA, error: null });

  const metaSelectEqFn = vi.fn().mockResolvedValue({ data: [], error: null });

  const projectOrderFn = vi.fn().mockResolvedValue({
    data: [
      { id: 'proj-001', name: 'Project Alpha' },
      { id: 'proj-002', name: 'Project Beta' },
    ],
    error: null,
  });

  const metaKeysOrderFn = vi.fn().mockResolvedValue({
    data: [{ key_name: 'Building type' }, { key_name: 'Floor' }, { key_name: 'Phase' }],
    error: null,
  });

  const client = {
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'media_items') {
        const mediaRow = {
          id: 'media-001',
          source_image_id: MOCK_MEDIA.id,
          organization_id: MOCK_MEDIA.organization_id,
          created_by: MOCK_MEDIA.user_id,
          storage_path: MOCK_MEDIA.storage_path,
          thumbnail_path: MOCK_MEDIA.thumbnail_path,
          latitude: MOCK_MEDIA.latitude,
          longitude: MOCK_MEDIA.longitude,
          exif_latitude: MOCK_MEDIA.exif_latitude,
          exif_longitude: MOCK_MEDIA.exif_longitude,
          captured_at: MOCK_MEDIA.captured_at,
          created_at: MOCK_MEDIA.created_at,
          mime_type: 'image/jpeg',
          location_status: 'gps',
          address_label: MOCK_MEDIA.address_label,
          street: MOCK_MEDIA.street,
          city: MOCK_MEDIA.city,
          district: MOCK_MEDIA.district,
          country: MOCK_MEDIA.country,
          media_type: 'image',
          gps_assignment_allowed: true,
        };
        return withChainFallback({
          select: vi.fn(() => ({
            or: vi.fn(() => ({
              limit: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({ data: mediaRow, error: null }),
              })),
            })),
          })),
          update: updateFn,
          delete: deleteFn,
        });
      }
      if (table === 'images') {
        return withChainFallback({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({ single: imageSingleFn }),
          }),
          update: updateFn,
          delete: deleteFn,
        });
      }
      if (table === 'media_metadata') {
        return withChainFallback({
          select: vi.fn().mockReturnValue({ eq: metaSelectEqFn }),
          upsert: upsertFn,
          delete: deleteFn,
        });
      }
      if (table === 'metadata_keys') {
        return withChainFallback({
          select: vi.fn().mockImplementation((cols: string) => {
            if (cols === 'key_name') {
              return {
                eq: vi.fn().mockReturnValue({ order: metaKeysOrderFn }),
              };
            }
            return {
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({ maybeSingle: maybeSingleFn }),
                  maybeSingle: maybeSingleFn,
                }),
              }),
            };
          }),
          insert: insertFn,
        });
      }
      if (table === 'projects') {
        return withChainFallback({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({ order: projectOrderFn }),
          }),
        });
      }
      // Unmodelled table: a chain that answers any method, so a query shape
      // added in production does not crash a test about something else.
      return createQueryChain({ data: null, error: null });
    }),
    rpc: vi.fn(() => createQueryChain({ data: [], error: null })),
    storage: {
      from: vi.fn().mockReturnValue({
        createSignedUrl: vi.fn().mockResolvedValue({
          data: { signedUrl: 'https://example.com/signed' },
          error: null,
        }),
      }),
    },
  };

  return {
    client,
    updateFn,
    updateEqFn,
    upsertFn,
    deleteFn,
    deleteEq1Fn,
    deleteEq2Fn,
    insertFn,
    maybeSingleFn,
    imageSingleFn,
    metaSelectEqFn,
    projectOrderFn,
    metaKeysOrderFn,
  };
}

// ── Setup helper ──────────────────────────────────────────────────────────────

export function setup() {
  const fake = buildFakeClient();
  const fakeMediaLocations = buildFakeMediaLocations();
  const fakeMetadata = buildFakeMetadataService();
  const fakeMediaLocationUpdate = buildFakeMediaLocationUpdate();
  const fakeGeocoding = {
    forward: vi.fn().mockResolvedValue(null),
    reverse: vi.fn().mockResolvedValue(null),
  };

  TestBed.configureTestingModule({
    imports: [MediaDetailViewComponent],
    schemas: [NO_ERRORS_SCHEMA],
    providers: [
      { provide: SupabaseService, useValue: { client: fake.client } },
      { provide: GeocodingService, useValue: fakeGeocoding },
      { provide: MediaLocationsService, useValue: fakeMediaLocations },
      { provide: MetadataService, useValue: fakeMetadata },
      { provide: MediaLocationUpdateService, useValue: fakeMediaLocationUpdate },
    ],
  });

  const fixture = TestBed.createComponent(MediaDetailViewComponent);
  const component = fixture.componentInstance;
  const ref = fixture.componentRef as ComponentRef<MediaDetailViewComponent>;

  // Trigger initial change detection without setting imageId (stays null).
  fixture.detectChanges();

  return {
    component,
    fixture,
    ref,
    fake,
    fakeGeocoding,
    fakeMediaLocations,
    fakeMetadata,
    fakeMediaLocationUpdate,
  };
}

/**
 * Point the component at a media row.
 *
 * The input is `mediaId`; this used to overwrite a property called `imageId`,
 * which the component no longer has. Assigning it silently did nothing, so
 * `mediaId()` stayed null and everything gated on it (saveMetadata,
 * removeMetadata, addMetadata) returned early — tests then failed on the
 * optimistic update rather than on what they were asserting.
 */
export function setImageId(component: MediaDetailViewComponent, id: string | null): void {
  (component as unknown as { mediaId: ReturnType<typeof signal<string | null>> }).mediaId = signal<
    string | null
  >(id);
}
