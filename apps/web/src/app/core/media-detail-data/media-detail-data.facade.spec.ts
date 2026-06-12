import { signal } from '@angular/core';
import { describe, expect, it, vi } from 'vitest';
import { MediaDetailDataFacade } from './media-detail-data.facade';
import type { MediaRecord } from '../../shared/workspace-pane/media-detail/media-detail-view.types';

const MOCK_MEDIA: MediaRecord = {
  id: 'img-1',
  user_id: 'user-1',
  organization_id: 'org-1',
  project_id: 'proj-1',
  storage_path: 'images/photo.jpg',
  thumbnail_path: 'images/photo-thumb.jpg',
  latitude: 1,
  longitude: 2,
  exif_latitude: 1,
  exif_longitude: 2,
  captured_at: '2025-01-01T10:00:00.000Z',
  has_time: true,
  created_at: '2025-01-01T12:00:00.000Z',
  address_label: 'Label',
  street: null,
  city: null,
  district: null,
  country: null,
  direction: null,
  location_unresolved: false,
};

function createFacade(overrides?: { media?: Partial<MediaRecord> }) {
  const media = signal<MediaRecord | null>(null);
  const metadata = signal<any[]>([]);
  const loading = signal(false);
  const error = signal<string | null>(null);
  const projectOptions = signal<any[]>([]);
  const metadataKeyDefinitions = signal<{ id: string; key_name: string; key_type: string }[]>([]);

  const supabase = {
    client: {
      from: vi.fn((table: string) => {
        if (table === 'media_items') {
          const storagePath =
            overrides?.media &&
            Object.prototype.hasOwnProperty.call(overrides.media, 'storage_path')
              ? overrides.media.storage_path
              : MOCK_MEDIA.storage_path;
          const thumbnailPath =
            overrides?.media &&
            Object.prototype.hasOwnProperty.call(overrides.media, 'thumbnail_path')
              ? overrides.media.thumbnail_path
              : MOCK_MEDIA.thumbnail_path;

          const data = {
            id: 'media-1',
            source_image_id: 'img-1',
            organization_id: 'org-1',
            created_by: 'user-1',
            storage_path: storagePath,
            thumbnail_path: thumbnailPath,
            latitude: overrides?.media?.latitude ?? MOCK_MEDIA.latitude,
            longitude: overrides?.media?.longitude ?? MOCK_MEDIA.longitude,
            exif_latitude: overrides?.media?.exif_latitude ?? MOCK_MEDIA.exif_latitude,
            exif_longitude: overrides?.media?.exif_longitude ?? MOCK_MEDIA.exif_longitude,
            captured_at: overrides?.media?.captured_at ?? MOCK_MEDIA.captured_at,
            created_at: overrides?.media?.created_at ?? MOCK_MEDIA.created_at,
            mime_type: 'image/jpeg',
            location_status: 'gps',
            address_label: overrides?.media?.address_label ?? MOCK_MEDIA.address_label,
            street: overrides?.media?.street ?? MOCK_MEDIA.street,
            city: overrides?.media?.city ?? MOCK_MEDIA.city,
            district: overrides?.media?.district ?? MOCK_MEDIA.district,
            country: overrides?.media?.country ?? MOCK_MEDIA.country,
            address_field_meta: overrides?.media?.address_field_meta ?? null,
          };
          return {
            select: vi.fn(() => ({
              or: vi.fn(() => ({
                limit: vi.fn(() => ({
                  maybeSingle: vi.fn(() => Promise.resolve({ data, error: null })),
                })),
              })),
            })),
          };
        }
        if (table === 'projects') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: vi.fn(() => Promise.resolve({ data: [{ id: 'p1', name: 'Alpha' }] })),
              })),
            })),
          };
        }

        return { select: vi.fn() };
      }),
    },
  } as any;

  const metadataService = {
    loadMetadataEntriesForMediaItem: vi.fn(async () => [
      { metadataKeyId: 'mk-1', key: 'Key', keyType: 'text', value: 'A' },
    ]),
    listMetadataKeyDefinitionsForOrganization: vi.fn(async () => [
      { id: 'def-1', key_name: 'Phase', key_type: 'text' },
    ]),
  } as any;

  const mediaDownloadService = {
    markNoMedia: vi.fn(),
    getSignedUrl: vi.fn(async (_path: string, size: string) => ({
      url: size === 'thumb' ? 'thumb-url' : 'full-url',
    })),
    preload: vi.fn(async () => true),
  } as any;

  const projectMemberships = {
    loadProjectMemberships: vi.fn(async () => {}),
  } as any;

  const facade = new MediaDetailDataFacade({
    services: { supabase, metadata: metadataService, mediaDownloadService, projectMemberships },
    signals: {
      media,
      metadata,
      loading,
      error,
      projectOptions,
      metadataKeyDefinitions,
    },
    computed: {
      mediaType: () => 'image',
      mediaMimeType: () => 'image/jpeg',
    },
  });

  return {
    facade,
    signals: { media, metadata, loading, error },
    deps: { metadataService, mediaDownloadService, projectMemberships },
  };
}

describe('MediaDetailDataFacade', () => {
  it('loads media state and metadata', async () => {
    const { facade, signals, deps } = createFacade();

    await facade.loadMedia('img-1', new AbortController().signal);

    expect(signals.media()?.id).toBe('img-1');
    expect(signals.metadata()[0].key).toBe('Key');
    expect(deps.projectMemberships.loadProjectMemberships).toHaveBeenCalledWith('img-1', null);
  });

  it('marks no-photo rows without requesting signed urls', async () => {
    const { facade, deps } = createFacade({ image: { storage_path: null, thumbnail_path: null } });

    await facade.loadMedia('img-1', new AbortController().signal);

    expect(deps.mediaDownloadService.markNoMedia).toHaveBeenCalledWith('img-1');
    expect(deps.mediaDownloadService.getSignedUrl).not.toHaveBeenCalled();
  });

});
