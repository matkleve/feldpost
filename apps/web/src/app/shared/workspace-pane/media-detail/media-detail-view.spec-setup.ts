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
import { Subject } from 'rxjs';
import {
  MediaDetailViewComponent,
  MediaRecord,
  MetadataEntry,
} from './media-detail-view.component';
import { SupabaseService } from '../../../core/supabase/supabase.service';
import { GeocodingService } from '../../../core/geocoding/geocoding.service';
import { createQueryChain, withChainFallback } from '../../../../test/mocks/supabase-chain.mock';
import { MediaLocationsService } from '../../../core/media-locations/media-locations.service';
import type { MediaItemLocationRow } from '../../../core/media-locations/media-locations.types';
import { MetadataService } from '../../../core/metadata/metadata.service';
import { MediaLocationUpdateService } from '../../../core/media-location-update/media-location-update.service';
import { MediaDeleteUndoService } from '../../../core/media-delete/media-delete-undo.service';
import type { ForwardGeocodeResult } from '../../../core/geocoding/geocoding.service';

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
 * Shared location write-back state for the media-detail fake stack.
 *
 * applyAddressSuggestion patches locally, then refreshMediaLocationFields reloads
 * via list_locations_for_media. A static empty RPC response overwrites the patch
 * with nulls — the diary's "needs a fake that reflects written values back".
 * @see docs/ai-diary/2026-09-16.md § Phase 0.4b
 * @see docs/study/006-upload-pipeline-correction-plan.md Phase 5 · Test debt
 */
export function createReflectingLocationStore() {
  const byMediaId = new Map<string, MediaItemLocationRow>();

  const rowFromSuggestion = (
    mediaItemId: string,
    suggestion: ForwardGeocodeResult,
  ): MediaItemLocationRow => ({
    id: 'loc-written',
    link_id: 'link-written',
    media_item_id: mediaItemId,
    organization_id: MOCK_MEDIA.organization_id ?? 'org-001',
    street: suggestion.street ?? null,
    house_number: suggestion.streetNumber || null,
    staircase: null,
    door: null,
    floor: null,
    postcode: suggestion.zip || null,
    extra_information: null,
    city: suggestion.city ?? null,
    district: suggestion.district ?? null,
    country: suggestion.country ?? null,
    latitude: suggestion.lat,
    longitude: suggestion.lng,
    address_label: suggestion.addressLabel ?? null,
    address_precision: null,
    sort_order: 0,
    staircase_sort_key: '',
    door_sort_key: '',
    created_at: '2025-06-15T12:00:00Z',
    updated_at: '2025-06-15T12:00:00Z',
  });

  return {
    record(mediaItemId: string, suggestion: ForwardGeocodeResult): MediaItemLocationRow {
      const row = rowFromSuggestion(mediaItemId, suggestion);
      byMediaId.set(mediaItemId, row);
      // refreshMediaLocationFields loads media_items, then lists by the canonical
      // row.id. This fixture's media_items.id is 'media-001' while media() carries
      // the legacy source_image_id (MOCK_MEDIA.id). Mirror the write under both.
      if (mediaItemId === MOCK_MEDIA.id) {
        byMediaId.set('media-001', { ...row, media_item_id: 'media-001' });
      } else if (mediaItemId === 'media-001') {
        byMediaId.set(MOCK_MEDIA.id, { ...row, media_item_id: MOCK_MEDIA.id });
      }
      return row;
    },
    list(mediaItemId: string): MediaItemLocationRow[] {
      const row = byMediaId.get(mediaItemId);
      return row ? [row] : [];
    },
  };
}

export type ReflectingLocationStore = ReturnType<typeof createReflectingLocationStore>;

/**
 * Stub for MediaLocationUpdateService.
 *
 * applyAddressSuggestion writes the address through this service (which calls
 * the resolve_media_location RPC) rather than updating media_items columns.
 * Unstubbed it returns not-ok, and the helper reverts its optimistic update.
 * When a reflecting store is supplied, recorded rows feed list_locations_for_media
 * so refreshMediaLocationFields does not wipe the write.
 */
export function buildFakeMediaLocationUpdate(store?: ReflectingLocationStore) {
  return {
    updateFromAddressSuggestion: vi.fn(async (mediaId: string, suggestion: ForwardGeocodeResult) => {
      const row = store?.record(mediaId, suggestion);
      return {
        ok: true as const,
        lat: suggestion.lat,
        lng: suggestion.lng,
        address: row
          ? {
              address_label: row.address_label,
              street: row.street,
              city: row.city,
              district: row.district,
              country: row.country,
              latitude: row.latitude,
              longitude: row.longitude,
            }
          : undefined,
      };
    }),
  };
}

export function buildFakeClient(store?: ReflectingLocationStore) {
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
    rpc: vi.fn((fn: string, args?: Record<string, unknown>) => {
      // refreshMediaLocationFields reloads address via this RPC after a write.
      // @see media-detail-data.facade.ts · enrichWithPrimaryLocation
      if (fn === 'list_locations_for_media') {
        const mediaItemId = String(args?.['p_media_item_id'] ?? '');
        return createQueryChain({
          data: store?.list(mediaItemId) ?? [],
          error: null,
        });
      }
      return createQueryChain({ data: [], error: null });
    }),
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

/**
 * Stub for MediaDeleteUndoService.
 *
 * executeDelete only emits `closed` when deleteWithUndo invokes onAfterDelete —
 * a rubber-stamp `{ ok: true }` leaves the UI open. Same trap as
 * media-detail-delete.helper.spec.ts.
 *
 * WorkspaceViewService also injects this and subscribes to mediaDeleted$ /
 * mediaRestored$ in its constructor — those streams must exist or setup()
 * dies before any test runs.
 */
export function buildFakeMediaDeleteUndo() {
  return {
    mediaDeleted$: new Subject<{ mediaItemIds: string[] }>().asObservable(),
    mediaRestored$: new Subject<{ mediaItemIds: string[] }>().asObservable(),
    deleteWithUndo: vi.fn(async ({ onAfterDelete }: { onAfterDelete?: () => void }) => {
      onAfterDelete?.();
      return { ok: true as const };
    }),
  };
}

// ── Setup helper ──────────────────────────────────────────────────────────────

export function setup() {
  const locationStore = createReflectingLocationStore();
  const fake = buildFakeClient(locationStore);
  const fakeMediaLocations = buildFakeMediaLocations();
  const fakeMetadata = buildFakeMetadataService();
  const fakeMediaLocationUpdate = buildFakeMediaLocationUpdate(locationStore);
  const fakeMediaDeleteUndo = buildFakeMediaDeleteUndo();
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
      { provide: MediaDeleteUndoService, useValue: fakeMediaDeleteUndo },
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
    fakeMediaDeleteUndo,
    locationStore,
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
