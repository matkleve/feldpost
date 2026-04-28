import { signal } from '@angular/core';
import { describe, expect, it, vi } from 'vitest';
import { ImageDetailMetadataHelper } from './media-detail-metadata.helper';
import type { ImageRecord, MetadataEntry } from './media-detail-view.types';

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
            from: vi.fn((table: string) => {
              if (table === 'media_items') {
                return {
                  select: vi.fn(() => ({
                    or: vi.fn(() => ({
                      limit: vi.fn(() => ({
                        maybeSingle: vi.fn(async () => ({ data: { id: 'media-1' }, error: null })),
                      })),
                    })),
                  })),
                };
              }
              return {
                upsert: vi.fn(async () => ({ error: null })),
              };
            }),
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
            from: vi.fn((table: string) => {
              if (table === 'media_items') {
                return {
                  select: vi.fn(() => ({
                    or: vi.fn(() => ({
                      limit: vi.fn(() => ({
                        maybeSingle: vi.fn(async () => ({ data: { id: 'media-1' }, error: null })),
                      })),
                    })),
                  })),
                };
              }
              return {
                delete: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    eq: vi.fn(async () => ({ error: { message: 'fail' } })),
                  })),
                })),
              };
            }),
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
