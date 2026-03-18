import { signal } from '@angular/core';
import { describe, expect, it, vi } from 'vitest';
import { ImageDetailDataFacade } from './image-detail-data.facade';
import type { ImageRecord } from './image-detail-view.types';

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
        if (table === 'images') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() =>
                  Promise.resolve({
                    data: { ...MOCK_IMAGE, ...overrides?.image },
                    error: null,
                  }),
                ),
              })),
            })),
          };
        }
        if (table === 'image_metadata') {
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
    expect(deps.projectMemberships.loadProjectMemberships).toHaveBeenCalledWith('img-1', 'proj-1');
  });

  it('marks no-photo rows without requesting signed urls', async () => {
    const { facade, deps } = createFacade({ image: { storage_path: null, thumbnail_path: null } });

    await facade.loadImage('img-1', new AbortController().signal);

    expect(deps.photoLoad.markNoPhoto).toHaveBeenCalledWith('img-1');
    expect(deps.photoLoad.getSignedUrl).not.toHaveBeenCalled();
  });
});
