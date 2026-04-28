import { signal } from '@angular/core';
import { describe, expect, it, vi } from 'vitest';
import type { MetadataService } from '../../../core/metadata/metadata.service';
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
    const saveMetadataValueByLookupId = vi.fn(async () => true);
    const metadataSvc = { saveMetadataValueByLookupId } as unknown as MetadataService;

    const helper = new ImageDetailMetadataHelper({
      services: {
        metadata: metadataSvc,
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
    expect(saveMetadataValueByLookupId).toHaveBeenCalledWith('img-1', 'mk-1', 'New');
  });

  it('restores removed metadata on delete failure', async () => {
    const metadata = signal<MetadataEntry[]>([ENTRY]);
    const removeMetadataValueByLookupId = vi.fn(async () => false);
    const metadataSvc = { removeMetadataValueByLookupId } as unknown as MetadataService;

    const helper = new ImageDetailMetadataHelper({
      services: {
        metadata: metadataSvc,
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
    expect(removeMetadataValueByLookupId).toHaveBeenCalledWith('img-1', 'mk-1');
  });
});
