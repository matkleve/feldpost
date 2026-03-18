import { signal } from '@angular/core';
import { describe, expect, it, vi } from 'vitest';
import { ImageDetailMetadataHelper } from './image-detail-metadata.helper';
import type { ImageRecord, MetadataEntry } from './image-detail-view.types';

const MOCK_IMAGE = {
  id: 'img-1',
  organization_id: 'org-1',
} as ImageRecord;

const ENTRY: MetadataEntry = { metadataKeyId: 'mk-1', key: 'Phase', value: 'Old' };

describe('ImageDetailMetadataHelper', () => {
  it('updates metadata optimistically', async () => {
    const metadata = signal<MetadataEntry[]>([ENTRY]);
    const helper = new ImageDetailMetadataHelper({
      services: {
        supabase: {
          client: {
            from: vi.fn(() => ({
              upsert: vi.fn(async () => ({ error: null })),
            })),
          },
        } as any,
      },
      signals: {
        image: signal<ImageRecord | null>(MOCK_IMAGE),
        imageId: () => 'img-1',
        metadata,
        saving: signal(false),
      },
    });

    await helper.saveMetadata(ENTRY, 'New');
    expect(metadata()[0].value).toBe('New');
  });

  it('restores removed metadata on delete failure', async () => {
    const metadata = signal<MetadataEntry[]>([ENTRY]);
    const helper = new ImageDetailMetadataHelper({
      services: {
        supabase: {
          client: {
            from: vi.fn(() => ({
              delete: vi.fn(() => ({
                eq: vi.fn(() => ({
                  eq: vi.fn(async () => ({ error: { message: 'fail' } })),
                })),
              })),
            })),
          },
        } as any,
      },
      signals: {
        image: signal<ImageRecord | null>(MOCK_IMAGE),
        imageId: () => 'img-1',
        metadata,
        saving: signal(false),
      },
    });

    await helper.removeMetadata(ENTRY);
    expect(metadata()).toEqual([ENTRY]);
  });
});
