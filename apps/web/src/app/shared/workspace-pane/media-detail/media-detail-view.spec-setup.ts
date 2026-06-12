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
        return {
          select: vi.fn(() => ({
            or: vi.fn(() => ({
              limit: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({ data: mediaRow, error: null }),
              })),
            })),
          })),
          update: updateFn,
          delete: deleteFn,
        };
      }
      if (table === 'images') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({ single: imageSingleFn }),
          }),
          update: updateFn,
          delete: deleteFn,
        };
      }
      if (table === 'media_metadata') {
        return {
          select: vi.fn().mockReturnValue({ eq: metaSelectEqFn }),
          upsert: upsertFn,
          delete: deleteFn,
        };
      }
      if (table === 'metadata_keys') {
        return {
          select: vi.fn().mockImplementation((cols: string) => {
            if (cols === 'key_name') {
              return {
                eq: vi.fn().mockReturnValue({ order: metaKeysOrderFn }),
              };
            }
            return {
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({ maybeSingle: maybeSingleFn }),
              }),
            };
          }),
          insert: insertFn,
        };
      }
      if (table === 'projects') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({ order: projectOrderFn }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      };
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

// ── Setup helper ──────────────────────────────────────────────────────────────

export function setup() {
  const fake = buildFakeClient();
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
    ],
  });

  const fixture = TestBed.createComponent(MediaDetailViewComponent);
  const component = fixture.componentInstance;
  const ref = fixture.componentRef as ComponentRef<MediaDetailViewComponent>;

  // Trigger initial change detection without setting imageId (stays null).
  fixture.detectChanges();

  return { component, fixture, ref, fake, fakeGeocoding };
}

export function setImageId(component: MediaDetailViewComponent, id: string | null): void {
  (component as unknown as { imageId: ReturnType<typeof signal<string | null>> }).imageId = signal<
    string | null
  >(id);
}
