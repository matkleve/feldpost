import { signal } from '@angular/core';
import { describe, expect, it, vi } from 'vitest';
import { ImageDetailDataFacade } from './media-detail-data.facade';
import type { ImageRecord } from './media-detail-view.types';

const MOCK_IMAGE: ImageRecord = {
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

function createFacade(overrides?: { image?: Partial<ImageRecord> }) {
  const image = signal<ImageRecord | null>(null);
  const metadata = signal<any[]>([]);
  const loading = signal(false);
  const error = signal<string | null>(null);
  const fullResPreloaded = signal(false);
  const fullResUrl = signal<string | null>(null);
  const thumbnailUrl = signal<string | null>(null);
  const projectOptions = signal<any[]>([]);
  const allMetadataKeyNames = signal<string[]>([]);

  const supabase = {
    client: {
      from: vi.fn((table: string) => {
        if (table === 'media_items') {
          const storagePath =
            overrides?.image &&
            Object.prototype.hasOwnProperty.call(overrides.image, 'storage_path')
              ? overrides.image.storage_path
              : MOCK_IMAGE.storage_path;
          const thumbnailPath =
            overrides?.image &&
            Object.prototype.hasOwnProperty.call(overrides.image, 'thumbnail_path')
              ? overrides.image.thumbnail_path
              : MOCK_IMAGE.thumbnail_path;

          const data = {
            id: 'media-1',
            source_image_id: 'img-1',
            organization_id: 'org-1',
            created_by: 'user-1',
            storage_path: storagePath,
            thumbnail_path: thumbnailPath,
            latitude: overrides?.image?.latitude ?? MOCK_IMAGE.latitude,
            longitude: overrides?.image?.longitude ?? MOCK_IMAGE.longitude,
            exif_latitude: overrides?.image?.exif_latitude ?? MOCK_IMAGE.exif_latitude,
            exif_longitude: overrides?.image?.exif_longitude ?? MOCK_IMAGE.exif_longitude,
            captured_at: overrides?.image?.captured_at ?? MOCK_IMAGE.captured_at,
            created_at: overrides?.image?.created_at ?? MOCK_IMAGE.created_at,
            mime_type: 'image/jpeg',
            location_status: 'gps',
            address_label: overrides?.image?.address_label ?? MOCK_IMAGE.address_label,
            street: overrides?.image?.street ?? MOCK_IMAGE.street,
            city: overrides?.image?.city ?? MOCK_IMAGE.city,
            district: overrides?.image?.district ?? MOCK_IMAGE.district,
            country: overrides?.image?.country ?? MOCK_IMAGE.country,
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
        if (table === 'media_metadata') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() =>
                Promise.resolve({
                  data: [
                    {
                      metadata_key_id: 'mk-1',
                      value_text: 'A',
                      metadata_keys: { key_name: 'Key' },
                    },
                  ],
                  error: null,
                }),
              ),
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
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => Promise.resolve({ data: [{ key_name: 'Phase' }] })),
            })),
          })),
        };
      }),
    },
  } as any;

  const photoLoad = {
    markNoPhoto: vi.fn(),
    getSignedUrl: vi.fn(async (_path: string, size: string) => ({
      url: size === 'thumb' ? 'thumb-url' : 'full-url',
    })),
    preload: vi.fn(async () => true),
  } as any;

  const projectMemberships = {
    loadProjectMemberships: vi.fn(async () => {}),
  } as any;

  const facade = new ImageDetailDataFacade({
    services: { supabase, photoLoad, projectMemberships },
    signals: {
      image,
      metadata,
      loading,
      error,
      fullResPreloaded,
      fullResUrl,
      thumbnailUrl,
      projectOptions,
      allMetadataKeyNames,
    },
    computed: {
      mediaType: () => 'image',
      mediaMimeType: () => 'image/jpeg',
    },
  });

  return {
    facade,
    signals: { image, metadata, loading, error, fullResPreloaded, fullResUrl, thumbnailUrl },
    deps: { photoLoad, projectMemberships },
  };
}

describe('ImageDetailDataFacade', () => {
  it('loads image state and metadata', async () => {
    const { facade, signals, deps } = createFacade();

    await facade.loadImage('img-1', new AbortController().signal);

    expect(signals.image()?.id).toBe('img-1');
    expect(signals.metadata()[0].key).toBe('Key');
    expect(deps.projectMemberships.loadProjectMemberships).toHaveBeenCalledWith('img-1', null);
  });

  it('marks no-photo rows without requesting signed urls', async () => {
    const { facade, deps } = createFacade({ image: { storage_path: null, thumbnail_path: null } });

    await facade.loadImage('img-1', new AbortController().signal);

    expect(deps.photoLoad.markNoPhoto).toHaveBeenCalledWith('img-1');
    expect(deps.photoLoad.getSignedUrl).not.toHaveBeenCalled();
  });
});
